"""
Parkly — High-Accuracy Number Plate Detection & OCR
Strategy: Let EasyOCR find all text, then apply Indian plate format
matching + position-aware error correction for near-perfect results.

Usage:  python detect.py <image_path>
Output: JSON to stdout
"""

import sys
import os
import re
import json
import cv2
import numpy as np

# ---------------------------------------------------------------------------
# Indian plate format knowledge
# ---------------------------------------------------------------------------
# Format: SS DD X DDDD  (e.g. MH 12 AB 1234)
#   SS   = State code (2 letters)
#   DD   = District (1-2 digits)
#   X    = Series (1-3 letters)
#   DDDD = Number (1-4 digits)
#
# Valid state codes
STATES = {
    "AN", "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "GA", "GJ", "HP",
    "HR", "JH", "JK", "KA", "KL", "LA", "LD", "MH", "ML", "MN", "MP", "MZ",
    "NL", "OD", "PB", "PY", "RJ", "SK", "TN", "TR", "TS", "UK", "UP", "WB",
}

# Strict Indian plate regex
PLATE_RE = re.compile(r"([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})")

# Common OCR misreads: what gets confused in each position type
LETTER_FIXES = {"0": "O", "1": "I", "2": "Z", "5": "S", "6": "G", "8": "B"}
DIGIT_FIXES  = {"O": "0", "I": "1", "Z": "2", "S": "5", "G": "6", "B": "8", "D": "0", "Q": "0", "L": "1", "T": "7"}


def fix_as_letter(ch):
    return LETTER_FIXES.get(ch, ch)

def fix_as_digit(ch):
    return DIGIT_FIXES.get(ch, ch)


def correct_plate(raw):
    """
    Brute-force position-aware correction.
    Tries ALL possible interpretations of ambiguous characters and
    picks the one that best matches Indian plate format with a valid state code.
    """
    if len(raw) < 6:
        return raw

    # Quick check: already valid?
    m = PLATE_RE.search(raw)
    if m and m.group(1) in STATES:
        return m.group(0)

    # Build all correction variants for ambiguous chars
    AMBIGUOUS = {
        "O": ["O", "0"], "0": ["0", "O"],
        "I": ["I", "1"], "1": ["1", "I"],
        "S": ["S", "5"], "5": ["5", "S"],
        "G": ["G", "6"], "6": ["6", "G"],
        "B": ["B", "8"], "8": ["8", "B"],
        "Z": ["Z", "2"], "2": ["2", "Z"],
        "D": ["D", "0"], "Q": ["Q", "0"],
        "L": ["L", "1"], "T": ["T", "7"], "7": ["7", "T"],
    }

    chars = list(raw)
    n = len(chars)

    # Generate candidate corrections (limit combinatorial explosion)
    # For each position, try the original + all ambiguous swaps
    candidates = [""]
    for ch in chars:
        options = AMBIGUOUS.get(ch, [ch])
        new_candidates = []
        for c in candidates:
            for opt in options:
                new_candidates.append(c + opt)
            if len(new_candidates) > 500:  # safety cap
                break
        candidates = new_candidates[:500]

    # Score each candidate
    best = raw
    best_score = -1

    for candidate in candidates:
        m = PLATE_RE.search(candidate)
        if not m:
            continue

        plate = m.group(0)
        state = m.group(1)
        district = m.group(2)
        series = m.group(3)
        number = m.group(4)

        score = 0
        if state in STATES:
            score += 10  # valid state = huge bonus
        score += len(plate)  # prefer longer matches
        if len(number) == 4:
            score += 3  # full 4-digit number
        if len(district) == 2:
            score += 2  # 2-digit district

        if score > best_score:
            best_score = score
            best = plate

    # If brute-force didn't find a format match, do simple positional fix
    if best_score <= 0:
        chars = list(raw)
        # First 2: letters
        for i in range(min(2, n)):
            chars[i] = fix_as_letter(chars[i])
        # Next 1-2: digits
        i = 2
        while i < n and i < 4 and (chars[i].isdigit() or chars[i] in DIGIT_FIXES):
            chars[i] = fix_as_digit(chars[i])
            i += 1
        # Next 1-3: letters
        series_start = i
        while i < n and i < series_start + 3 and (chars[i].isalpha() or chars[i] in LETTER_FIXES):
            chars[i] = fix_as_letter(chars[i])
            i += 1
        # Rest: digits (THIS is the key fix — force all trailing chars to digits)
        while i < n:
            chars[i] = fix_as_digit(chars[i])
            i += 1
        best = "".join(chars)

    return best


# ---------------------------------------------------------------------------
# EasyOCR reader (lazy init)
# ---------------------------------------------------------------------------
_reader = None

def get_reader():
    global _reader
    if _reader is None:
        import easyocr
        _reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    return _reader


def output(plate=None, confidence=0.0, method="none", error=None):
    result = {"plate": plate, "confidence": round(confidence, 2), "method": method}
    if error:
        result["error"] = error
    print(json.dumps(result))
    sys.exit(0 if plate else 1)


# ---------------------------------------------------------------------------
# Core detection pipeline
# ---------------------------------------------------------------------------
def detect_plate(img):
    """
    Run EasyOCR on the full image + preprocessed variants,
    collect all text fragments, score them by plate-likeness.
    """
    reader = get_reader()
    h, w = img.shape[:2]

    # Prepare image variants for robustness
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    variants = [
        ("color", img),
        ("gray", gray),
    ]

    # If image is large, also try a cropped bottom-half (plates are usually lower)
    if h > 400:
        bottom = img[int(h * 0.3):, :]
        variants.append(("bottom", bottom))

    # If image is small, upscale
    if max(h, w) < 600:
        scale = 800 / max(h, w)
        upscaled = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        variants.append(("upscaled", upscaled))

    # Contrast-enhanced variant
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    variants.append(("enhanced", enhanced))

    # Collect all OCR results across variants
    candidates = []

    for label, variant in variants:
        try:
            results = reader.readtext(variant, detail=1, paragraph=False,
                                      allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
                                      width_ths=0.9, height_ths=0.5)
        except Exception:
            continue

        # Individual text blocks
        for (bbox, text, conf) in results:
            cleaned = re.sub(r"[^A-Z0-9]", "", text.upper())
            if len(cleaned) >= 4:
                candidates.append((cleaned, conf, label))

        # Also try merging nearby text blocks (plates sometimes split into 2-3 parts)
        if len(results) >= 2:
            # Sort by x-position (left to right)
            sorted_results = sorted(results, key=lambda r: r[0][0][0])
            for i in range(len(sorted_results)):
                merged = ""
                max_conf = 0
                for j in range(i, min(i + 4, len(sorted_results))):
                    part = re.sub(r"[^A-Z0-9]", "", sorted_results[j][1].upper())
                    merged += part
                    max_conf = max(max_conf, sorted_results[j][2])
                    if len(merged) >= 6:
                        candidates.append((merged, max_conf * 0.95, label + "-merged"))

    # Score each candidate
    scored = []
    for text, conf, method in candidates:
        corrected = correct_plate(text)

        # Check if it matches Indian plate format
        m = PLATE_RE.search(corrected)
        if m:
            plate_str = m.group(0)
            state = m.group(1)
            is_valid_state = state in STATES

            score = conf * 0.5                          # OCR confidence
            score += 0.25 if is_valid_state else 0.05   # valid state code
            score += 0.15 if len(plate_str) >= 9 else 0.08  # full-length plate
            score += 0.10                                # format match bonus

            scored.append((plate_str, score, method))
        else:
            # No format match — lower score
            score = conf * 0.3
            scored.append((corrected[:12], score, method))

    if not scored:
        return None, 0.0, "none"

    # Pick best
    scored.sort(key=lambda x: x[1], reverse=True)
    best_plate, best_score, best_method = scored[0]
    return best_plate, min(best_score, 0.99), best_method


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    try:
        if len(sys.argv) < 2:
            output(error="Usage: python detect.py <image_path>")

        image_path = sys.argv[1]
        if not os.path.isfile(image_path):
            output(error=f"File not found: {image_path}")

        img = cv2.imread(image_path)
        if img is None:
            output(error=f"Could not read image: {image_path}")

        plate, confidence, method = detect_plate(img)

        if plate:
            output(plate=plate, confidence=confidence, method=method)
        else:
            output(error="No plate detected in image")
    except Exception as e:
        output(error=f"Detection crashed: {str(e)}")


if __name__ == "__main__":
    main()
