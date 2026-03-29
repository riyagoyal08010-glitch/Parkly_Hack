/**
 * Parkly — Plate Detection API Server
 *
 * Bridges the Python CV module with the React frontend.
 * Accepts image uploads, runs detection, checks against registered plates.
 *
 * Run:  cd ai && npm install && npm start
 * URL:  http://localhost:5050
 */

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 5050;

// ---------------------------------------------------------------------------
// InsForge database config — direct HTTP calls (no SDK dependency)
// ---------------------------------------------------------------------------
const INSFORGE_URL = process.env.INSFORGE_URL || "https://2j752e34.us-east.insforge.app";
const INSFORGE_KEY = process.env.INSFORGE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2ODczMDZ9.iEGb77haefC7uHs6la1weeG0w7qpM9FCLmT5urzAqOE";

// Helper: call InsForge RPC function via REST API
async function insforgeRpc(fnName, params) {
  const res = await fetch(`${INSFORGE_URL}/rest/v1/rpc/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": INSFORGE_KEY,
      "Authorization": `Bearer ${INSFORGE_KEY}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text();
    return { data: null, error: { message: text } };
  }
  const data = await res.json();
  return { data, error: null };
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());

// Upload directory
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `plate_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|bmp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error("Only image files allowed"), ok);
  },
});

// ---------------------------------------------------------------------------
// Check if a plate has an active booking in the real database
// ---------------------------------------------------------------------------
async function isPlateRegistered(plate) {
  const cleaned = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const { data, error } = await insforgeRpc("get_booking_by_plate", { plate: cleaned });
  if (error || !data || data.length === 0) return { registered: false, bookings: [] };
  return { registered: true, bookings: data };
}

// ---------------------------------------------------------------------------
// Detection log (in-memory — replace with DB in production)
// ---------------------------------------------------------------------------
const detectionLog = [];
const COOLDOWN_MS = 10_000; // 10s cooldown per plate
const recentPlates = new Map(); // plate -> timestamp

// ---------------------------------------------------------------------------
// POST /detect-plate
// ---------------------------------------------------------------------------
app.post("/detect-plate", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  const imagePath = req.file.path;
  const pythonCmd = process.platform === "win32" ? "python" : "python3";
  const scriptPath = path.join(__dirname, "detect.py");

  // Set Tesseract path for Windows if needed
  const env = { ...process.env };
  const tesseractWin = "C:\\Program Files\\Tesseract-OCR\\tesseract.exe";
  if (process.platform === "win32" && fs.existsSync(tesseractWin)) {
    env.TESSERACT_CMD = tesseractWin;
  }

  const child = spawn(pythonCmd, [scriptPath, imagePath], { env, shell: true });
  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (data) => { stdout += data.toString(); });
  child.stderr.on("data", (data) => { stderr += data.toString(); });

  // Kill if it takes too long (2 minutes for slow machines / first-time model load)
  const killTimer = setTimeout(() => {
    child.kill();
  }, 120_000);

  child.on("close", async (code) => {
    clearTimeout(killTimer);
    // Cleanup uploaded file after processing
    fs.unlink(imagePath, () => {});

    console.log(`Python exited with code ${code}`);
    if (stderr) console.log("Python stderr:", stderr.slice(0, 500));

    // Extract JSON from stdout (ignore EasyOCR/torch warnings printed to stdout)
    let jsonStr = "";
    const lines = stdout.trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith("{")) {
        jsonStr = line;
        break;
      }
    }

    if (!jsonStr) {
      return res.status(500).json({ error: "Detection failed", details: stderr.slice(0, 300) || `Exit code: ${code}` });
    }

    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch (e) {
      return res.status(500).json({ error: "Invalid detection output", raw: stdout.slice(0, 500) });
    }

    if (!result.plate) {
      return res.json({
        plate: null,
        status: "denied",
        confidence: 0,
        method: result.method || "none",
        message: result.error || "No plate detected",
      });
    }

    // Cooldown check
    const lastSeen = recentPlates.get(result.plate);
    if (lastSeen && Date.now() - lastSeen < COOLDOWN_MS) {
      return res.json({
        plate: result.plate,
        status: "cooldown",
        confidence: result.confidence,
        method: result.method,
        message: "Duplicate detection — please wait before scanning again",
      });
    }
    recentPlates.set(result.plate, Date.now());

    // Check against real bookings database
    const { registered, bookings } = await isPlateRegistered(result.plate);

    // Log entry
    const logEntry = {
      plate: result.plate,
      status: registered ? "granted" : "denied",
      confidence: result.confidence,
      method: result.method,
      timestamp: new Date().toISOString(),
      booking: registered ? bookings[0] : null,
    };
    detectionLog.push(logEntry);

    return res.json({
      plate: result.plate,
      status: registered ? "granted" : "denied",
      confidence: result.confidence,
      method: result.method,
      message: registered ? "Access granted — vehicle has an active booking" : "Access denied — no active booking found",
      booking: registered ? bookings[0] : null,
    });
  });
});

// ---------------------------------------------------------------------------
// GET /detection-log — View recent detections
// ---------------------------------------------------------------------------
app.get("/detection-log", (_, res) => {
  res.json(detectionLog.slice(-50).reverse());
});

// ---------------------------------------------------------------------------
// GET /api/bookings/plate/:numberPlate — Look up bookings by number plate
// Used by the plate detection ML system and admin dashboard
// Returns active booking details for the given plate
// ---------------------------------------------------------------------------
app.get("/api/bookings/plate/:numberPlate", async (req, res) => {
  const { numberPlate } = req.params;
  if (!numberPlate || numberPlate.length < 6) {
    return res.status(400).json({ error: "Invalid plate number" });
  }

  // Sanitize: strip non-alphanumeric chars, uppercase
  const cleaned = numberPlate.toUpperCase().replace(/[^A-Z0-9]/g, "");

  const { data, error } = await insforgeRpc("get_booking_by_plate", { plate: cleaned });

  if (error) {
    return res.status(500).json({ error: "Database query failed", details: error.message });
  }

  if (!data || data.length === 0) {
    return res.json({
      found: false,
      plate: cleaned,
      message: "No active booking found for this plate",
      bookings: [],
    });
  }

  return res.json({
    found: true,
    plate: cleaned,
    message: `Found ${data.length} active booking(s)`,
    bookings: data,
  });
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/health", (_, res) => res.json({ status: "ok", uptime: process.uptime() }));

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n  Parkly Plate Detection API`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  Database: ${INSFORGE_URL}`);
  console.log(`  Endpoints:`);
  console.log(`    POST /detect-plate                    — upload image for detection`);
  console.log(`    GET  /detection-log                   — view recent detections`);
  console.log(`    GET  /api/bookings/plate/:numberPlate — look up bookings by plate\n`);
});
