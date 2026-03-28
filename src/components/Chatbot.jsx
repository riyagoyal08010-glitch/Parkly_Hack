import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, RotateCcw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from 'react-router-dom'
import { sendChatMessage } from '../lib/chat'

const QUICK_QUESTIONS = [
  { label: 'How do I book?', text: 'How do I book a parking spot?' },
  { label: 'Payment methods', text: 'What payment methods are supported?' },
  { label: 'Cancel booking', text: 'How do I cancel a booking?' },
  { label: 'Become a host', text: 'How can I list my parking space as a host?' },
  { label: 'Slot types', text: 'What are the different slot sizes (S/M/L)?' },
  { label: 'Pricing info', text: 'How does pricing work?' },
]

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 bg-gray-400 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ message, isLast }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
        isUser ? 'bg-black' : 'bg-gradient-to-br from-gray-100 to-gray-200'
      }`}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-white" />
          : <Bot className="w-3.5 h-3.5 text-gray-600" />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-black text-white rounded-2xl rounded-tr-md'
          : 'bg-gray-100 text-gray-800 rounded-2xl rounded-tl-md'
      }`}>
        {message.content}
      </div>
    </motion.div>
  )
}

export default function Chatbot() {
  const { user, profile, role } = useAuth()
  const location = useLocation()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const getPageContext = () => {
    const path = location.pathname
    if (path === '/explore') return 'Explore Parking'
    if (path.startsWith('/parking/')) return 'Parking Detail'
    if (path === '/dashboard') return 'My Bookings'
    if (path.startsWith('/host')) return 'Host Dashboard'
    if (path.startsWith('/admin')) return 'Admin Dashboard'
    if (path === '/') return 'Home'
    return path
  }

  const handleSend = async (text) => {
    const content = (text || input).trim()
    if (!content || loading) return

    setInput('')
    setError(null)

    const userMessage = { role: 'user', content }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setLoading(true)

    try {
      const context = {
        userName: profile?.name || undefined,
        userRole: role || undefined,
        currentPage: getPageContext(),
      }

      // Send only role + content for API
      const apiMessages = updatedMessages.map((m) => ({ role: m.role, content: m.content }))
      const reply = await sendChatMessage(apiMessages, context)

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message || 'Failed to get response')
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReset = () => {
    setMessages([])
    setError(null)
  }

  const showQuickQuestions = messages.length === 0

  return (
    <>
      {/* Floating toggle button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-black text-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center group"
          >
            <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-2xl bg-black/20 animate-ping opacity-30" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[560px] max-h-[calc(100vh-120px)] bg-white rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.15)] border border-gray-200/80 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-black text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Parkly Assistant</h3>
                  <p className="text-[11px] text-white/50">AI-powered help</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={handleReset}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    title="Clear chat"
                  >
                    <RotateCcw className="w-4 h-4 text-white/60" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Welcome message */}
              {showQuickQuestions && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm leading-relaxed max-w-[80%]">
                      Hi{profile?.name ? ` ${profile.name.split(' ')[0]}` : ''}! I'm your Parkly assistant. Ask me anything about parking, bookings, payments, or hosting.
                    </div>
                  </div>

                  {/* Quick questions */}
                  <div className="mt-4 ml-9">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2">Quick questions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_QUESTIONS.map((q) => (
                        <button
                          key={q.label}
                          onClick={() => handleSend(q.text)}
                          className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Message list */}
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} isLast={i === messages.length - 1} />
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-tl-md">
                    <TypingIndicator />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error banner */}
            {error && (
              <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                {error}
              </div>
            )}

            {/* Input area */}
            <div className="px-4 pb-4 pt-2 border-t border-gray-100 shrink-0">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about Parkly..."
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-gray-50 transition-all placeholder:text-gray-400 disabled:opacity-60 pr-11"
                  />
                </div>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="p-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-300 text-center mt-2">Powered by AI. Responses may not always be accurate.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
