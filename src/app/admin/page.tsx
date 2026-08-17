'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Memory } from '@/lib/types'

const PERSON_NAME = process.env.NEXT_PUBLIC_PERSON_NAME ?? 'the birthday star'

interface AdminMemory extends Memory {
  signedUrl?: string
}

interface AdminAttempt {
  id: string
  guest_name: string
  score: number
  correct_answers: number
  wrong_answers: number
  started_at: string
  completed_at: string | null
  rank: number
  qualified: boolean
  isWinner: boolean
}

interface AttemptAnswer {
  id: number
  selected_answer: string
  is_correct: boolean
  points_earned: number
  quiz_questions: {
    id: number
    question: string
    correct_answer: string
  } | null
}

interface CrosswordAttempt {
  id: string
  guest_name: string
  tag: string
  status: string
  score: number | null
  elapsed_seconds: number | null
  started_at: string
  completed_at: string | null
}

interface QuizQuestionAdmin {
  id: number
  question: string
  answers: string[]
  correct_answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  display_order: number
  is_active: boolean
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [memories, setMemories] = useState<AdminMemory[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [visitorCount, setVisitorCount] = useState<number | null>(null)
  const [recentVisitors, setRecentVisitors] = useState<{ id: string; name: string; entered_at: string; word: string | null }[]>([])

  // Quiz state
  const [quizAttempts, setQuizAttempts] = useState<AdminAttempt[]>([])
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null)
  const [attemptDetails, setAttemptDetails] = useState<Record<string, AttemptAnswer[]>>({})
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionAdmin[]>([])
  const [editingQuestion, setEditingQuestion] = useState<Partial<QuizQuestionAdmin> | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newQuestion, setNewQuestion] = useState<Partial<QuizQuestionAdmin>>({
    question: '', answers: ['', '', '', ''], correct_answer: '', difficulty: 'easy', points: 1, display_order: 0, is_active: true,
  })
  const [quizDeleteConfirm, setQuizDeleteConfirm] = useState<number | null>(null)

  // Crossword state
  const [crosswordAttempts, setCrosswordAttempts] = useState<CrosswordAttempt[]>([])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAuthed(true)
    } else {
      setPasswordError('Incorrect password 🔒')
    }
  }

  const fetchMemories = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/memories')
    const data = await res.json()
    setMemories(data.memories || [])
    setLoading(false)
  }

  const fetchVisitors = async () => {
    const res = await fetch('/api/admin/visitors')
    const data = await res.json()
    setVisitorCount(data.count ?? 0)
    setRecentVisitors((data.visitors ?? []).slice(0, 10))
  }

  const fetchQuizAttempts = async () => {
    const res = await fetch('/api/admin/quiz')
    const data = await res.json()
    setQuizAttempts(data.attempts || [])
  }

  const fetchQuizQuestions = async () => {
    const res = await fetch('/api/admin/quiz/questions')
    const data = await res.json()
    setQuizQuestions(data.questions || [])
  }

  const fetchCrosswordAttempts = async () => {
    const res = await fetch('/api/admin/crossword')
    const data = await res.json()
    setCrosswordAttempts(data.attempts || [])
  }

  useEffect(() => {
    if (authed) {
      fetchMemories()
      fetchVisitors()
      fetchQuizAttempts()
      fetchQuizQuestions()
      fetchCrosswordAttempts()
    }
  }, [authed])

  const toggleVisible = async (id: string, current: boolean) => {
    await fetch(`/api/admin/memories?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_visible: !current }),
    })
    setMemories(prev => prev.map(m => m.id === id ? { ...m, is_visible: !current } : m))
  }

  const deleteMemory = async (id: string) => {
    await fetch(`/api/admin/memories?id=${id}`, { method: 'DELETE' })
    setMemories(prev => prev.filter(m => m.id !== id))
    setDeleteConfirm(null)
  }

  const downloadExport = () => {
    window.open('/api/admin/export', '_blank')
  }

  const loadAttemptDetails = async (id: string) => {
    if (attemptDetails[id]) {
      setExpandedAttempt(expandedAttempt === id ? null : id)
      return
    }
    const res = await fetch(`/api/admin/quiz/attempt?id=${id}`)
    const data = await res.json()
    setAttemptDetails(prev => ({ ...prev, [id]: data.answers || [] }))
    setExpandedAttempt(id)
  }

  const saveQuestion = async () => {
    if (!editingQuestion || editingId === null) return
    await fetch(`/api/admin/quiz/questions?id=${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingQuestion),
    })
    setEditingId(null)
    setEditingQuestion(null)
    fetchQuizQuestions()
  }

  const deleteQuestion = async (id: number) => {
    await fetch(`/api/admin/quiz/questions?id=${id}`, { method: 'DELETE' })
    setQuizQuestions(prev => prev.filter(q => q.id !== id))
    setQuizDeleteConfirm(null)
  }

  const addQuestion = async () => {
    const res = await fetch('/api/admin/quiz/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newQuestion),
    })
    const data = await res.json()
    if (data.question) {
      setQuizQuestions(prev => [...prev, data.question])
      setShowAddForm(false)
      setNewQuestion({ question: '', answers: ['', '', '', ''], correct_answer: '', difficulty: 'easy', points: 1, display_order: 0, is_active: true })
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-day-cream p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm border-2 border-accent-marigold/20">
          <h1 className="font-display text-3xl text-accent-marigold text-center mb-6">🔐 Admin</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password..."
              className="w-full px-4 py-3 rounded-2xl border-2 border-day-gold/50 focus:border-accent-marigold focus:outline-none"
            />
            {passwordError && <p className="text-accent-coral text-sm text-center">{passwordError}</p>}
            <button type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-accent-marigold to-accent-coral text-white font-display text-lg">
              Enter 🦁
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-day-cream p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h1 className="font-display text-4xl text-accent-marigold">🦁 {PERSON_NAME}&apos;s Admin Dashboard</h1>
          <div className="flex gap-3">
            <button onClick={() => { fetchMemories(); fetchVisitors(); fetchQuizAttempts(); fetchQuizQuestions(); fetchCrosswordAttempts() }}
              className="px-4 py-2 rounded-xl bg-day-gold/20 text-accent-marigold border border-day-gold/50 hover:bg-day-gold/30 transition-colors text-sm font-semibold">
              🔄 Refresh
            </button>
            <button onClick={downloadExport}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-accent-marigold to-accent-coral text-white font-semibold text-sm shadow-md hover:shadow-lg transition-shadow">
              📖 Download Memory Book (PDF)
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-md border border-day-gold/20 text-center">
            <p className="text-4xl font-bold text-accent-marigold">{visitorCount ?? '…'}</p>
            <p className="text-sm text-gray-500 mt-1">👤 Guests who entered</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-md border border-day-gold/20 text-center">
            <p className="text-4xl font-bold text-accent-marigold">{memories.length}</p>
            <p className="text-sm text-gray-500 mt-1">💌 Memories left</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-md border border-day-gold/20 text-center col-span-2 md:col-span-1">
            <p className="text-4xl font-bold text-accent-marigold">
              {visitorCount !== null && memories.length > 0
                ? `${Math.round((memories.length / visitorCount) * 100)}%`
                : '…'}
            </p>
            <p className="text-sm text-gray-500 mt-1">📊 Left a memory</p>
          </div>
        </div>

        {/* Recent visitors */}
        {recentVisitors.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-md border border-day-gold/20 mb-8">
            <h2 className="font-semibold text-accent-marigold mb-4">🎉 Recent guests (last 10)</h2>
            <div className="flex flex-wrap gap-2">
              {recentVisitors.map(v => (
                <span key={v.id} className="px-3 py-1 rounded-full bg-day-gold/10 text-accent-marigold text-sm border border-day-gold/20 flex items-center gap-1.5">
                  {v.word && (
                    <span className="px-2 py-0.5 rounded-full bg-accent-marigold/20 text-accent-marigold text-xs font-bold border border-accent-marigold/30">
                      {v.word}
                    </span>
                  )}
                  {v.name}
                  <span className="text-gray-400 text-xs ml-1">
                    {new Date(v.entered_at).toLocaleString()}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-gray-600 mb-6">{memories.length} total memories</p>

        {loading ? (
          <div className="text-center py-20 text-4xl animate-pulse">✨</div>
        ) : (
          <div className="space-y-4 mb-12">
            {memories.map(memory => (
              <div key={memory.id}
                className={`bg-white rounded-2xl p-5 shadow-md border-l-4 ${memory.is_public ? 'border-accent-marigold' : 'border-gray-400'}`}>
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {memory.signedUrl && (
                    <div className="flex-shrink-0">
                      <Image src={memory.signedUrl} alt="Memory photo"
                        width={120} height={120} className="rounded-xl object-cover w-28 h-28" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${memory.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {memory.is_public ? '🎉 Public' : '🔒 Secret'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${memory.is_visible ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                        {memory.is_visible ? '👁️ Visible' : '🚫 Hidden'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(memory.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-800">{memory.name}</p>
                    <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">{memory.message}</p>
                  </div>

                  <div className="flex flex-row md:flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleVisible(memory.id, memory.is_visible)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold border transition-colors border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      {memory.is_visible ? '🚫 Hide' : '👁️ Show'}
                    </button>

                    {deleteConfirm === memory.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => deleteMemory(memory.id)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600">
                          Confirm
                        </button>
                        <button onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(memory.id)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── QUIZ RESULTS ── */}
        <div className="bg-white rounded-2xl shadow-md border border-day-gold/20 mb-8 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-accent-marigold text-lg">🏆 Quiz Results</h2>
            <span className="text-sm text-gray-500">{quizAttempts.length} completed</span>
          </div>

          {quizAttempts.length === 0 ? (
            <p className="text-gray-400 text-sm p-5">No quiz attempts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Rank</th>
                    <th className="text-left px-4 py-3">Guest</th>
                    <th className="text-left px-4 py-3">Score</th>
                    <th className="text-left px-4 py-3">Correct / Total</th>
                    <th className="text-left px-4 py-3">Wrong</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Completed</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {quizAttempts.map(attempt => (
                    <>
                      <tr
                        key={attempt.id}
                        className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => loadAttemptDetails(attempt.id)}
                      >
                        <td className="px-4 py-3 font-bold text-accent-marigold">#{attempt.rank}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{attempt.guest_name}</td>
                        <td className="px-4 py-3 font-bold text-gray-800">{attempt.score}</td>
                        <td className="px-4 py-3 text-gray-600">{attempt.correct_answers} / {attempt.correct_answers + attempt.wrong_answers}</td>
                        <td className="px-4 py-3 text-gray-500">{attempt.wrong_answers}</td>
                        <td className="px-4 py-3">
                          {attempt.isWinner ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">🏆 Winner</span>
                          ) : attempt.qualified ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">✅ Qualified</span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {attempt.completed_at ? new Date(attempt.completed_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {expandedAttempt === attempt.id ? '▲' : '▼'}
                        </td>
                      </tr>
                      {expandedAttempt === attempt.id && attemptDetails[attempt.id] && (
                        <tr key={`${attempt.id}-detail`}>
                          <td colSpan={8} className="bg-gray-50 px-4 py-4">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 uppercase tracking-wider">
                                  <th className="text-left pb-2">Question</th>
                                  <th className="text-left pb-2">Guest Answer</th>
                                  <th className="text-left pb-2">Correct Answer</th>
                                  <th className="text-left pb-2">Result</th>
                                  <th className="text-left pb-2">Pts</th>
                                </tr>
                              </thead>
                              <tbody>
                                {attemptDetails[attempt.id].map(ans => (
                                  <tr key={ans.id} className="border-t border-gray-200">
                                    <td className="py-2 pr-4 text-gray-700 max-w-xs">{ans.quiz_questions?.question ?? '—'}</td>
                                    <td className="py-2 pr-4 text-gray-600">{ans.selected_answer}</td>
                                    <td className="py-2 pr-4 text-gray-500">{ans.quiz_questions?.correct_answer ?? '—'}</td>
                                    <td className="py-2 pr-4">{ans.is_correct ? '✅' : '❌'}</td>
                                    <td className="py-2 font-semibold text-accent-marigold">{ans.points_earned}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── CROSSWORD RESULTS ── */}
        <div className="bg-white rounded-2xl shadow-md border border-day-gold/20 mb-8 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-accent-marigold text-lg">🧩 Crossword Results</h2>
            <span className="text-sm text-gray-500">{crosswordAttempts.length} attempts</span>
          </div>

          {crosswordAttempts.length === 0 ? (
            <p className="text-gray-400 text-sm p-5">No crossword attempts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Guest</th>
                    <th className="text-left px-4 py-3">Tag</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Time</th>
                    <th className="text-left px-4 py-3">Score</th>
                    <th className="text-left px-4 py-3">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {crosswordAttempts.map(a => (
                    <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{a.guest_name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">{a.tag}</span>
                      </td>
                      <td className="px-4 py-3">
                        {a.status === 'completed' ? (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">✅ Completed</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">⏳ In progress</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {a.elapsed_seconds != null
                          ? `${Math.floor(a.elapsed_seconds / 60).toString().padStart(2, '0')}:${(a.elapsed_seconds % 60).toString().padStart(2, '0')}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800">{a.score ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(a.started_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── QUIZ MANAGEMENT ── */}
        <div className="bg-white rounded-2xl shadow-md border border-day-gold/20 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-accent-marigold text-lg">📝 Quiz Questions Management</h2>
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="px-4 py-2 rounded-xl bg-accent-marigold text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {showAddForm ? '✕ Cancel' : '+ Add Question'}
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="p-5 border-b border-gray-100 bg-amber-50">
              <QuestionForm
                data={newQuestion}
                onChange={setNewQuestion}
                onSave={addQuestion}
                onCancel={() => setShowAddForm(false)}
                saveLabel="Add Question"
              />
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {quizQuestions.map(q => (
              <div key={q.id} className="p-4">
                {editingId === q.id ? (
                  <QuestionForm
                    data={editingQuestion ?? q}
                    onChange={setEditingQuestion}
                    onSave={saveQuestion}
                    onCancel={() => { setEditingId(null); setEditingQuestion(null) }}
                    saveLabel="Save"
                  />
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold text-gray-400">#{q.display_order}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          q.difficulty === 'easy' ? 'bg-yellow-100 text-yellow-700' :
                          q.difficulty === 'medium' ? 'bg-purple-100 text-purple-700' :
                          'bg-red-100 text-red-700'
                        }`}>{q.difficulty}</span>
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">{q.points}pt</span>
                        {!q.is_active && <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-500">inactive</span>}
                      </div>
                      <p className="font-medium text-gray-800 text-sm mb-2">{q.question}</p>
                      <div className="flex flex-wrap gap-1">
                        {q.answers.map((a, i) => (
                          <span key={i} className={`px-2 py-0.5 rounded text-xs border ${a === q.correct_answer ? 'border-green-400 text-green-700 bg-green-50 font-semibold' : 'border-gray-200 text-gray-500'}`}>
                            {a === q.correct_answer ? '✓ ' : ''}{a}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setEditingId(q.id); setEditingQuestion({ ...q }) }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        ✏️ Edit
                      </button>
                      {quizDeleteConfirm === q.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => deleteQuestion(q.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600">Confirm</button>
                          <button onClick={() => setQuizDeleteConfirm(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 text-gray-600">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setQuizDeleteConfirm(q.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50">🗑️</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {quizQuestions.length === 0 && (
              <p className="text-gray-400 text-sm p-5">No questions yet. Add some above!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Inline question editor ────────────────────────────────────────────────────
function QuestionForm({
  data,
  onChange,
  onSave,
  onCancel,
  saveLabel,
}: {
  data: Partial<QuizQuestionAdmin>
  onChange: (d: Partial<QuizQuestionAdmin>) => void
  onSave: () => void
  onCancel: () => void
  saveLabel: string
}) {
  const answers: string[] = (data.answers as string[]) ?? ['', '', '', '']

  const setAnswer = (i: number, val: string) => {
    const next = [...answers]
    next[i] = val
    onChange({ ...data, answers: next })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Question</label>
        <input
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-accent-marigold"
          value={data.question ?? ''}
          onChange={e => onChange({ ...data, question: e.target.value })}
          placeholder="Question text..."
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {answers.map((a, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${data.id ?? 'new'}`}
              checked={data.correct_answer === a && a !== ''}
              onChange={() => onChange({ ...data, correct_answer: a })}
              title={`Mark answer ${i + 1} as correct`}
            />
            <input
              className="flex-1 px-2 py-1.5 rounded border border-gray-200 text-xs focus:outline-none focus:border-green-400"
              value={a}
              onChange={e => setAnswer(i, e.target.value)}
              placeholder={`Answer ${String.fromCharCode(65 + i)}...`}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">Select the radio button next to the correct answer.</p>

      <div className="flex gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Difficulty</label>
          <select
            className="px-2 py-1.5 rounded border border-gray-200 text-xs focus:outline-none"
            value={data.difficulty ?? 'easy'}
            onChange={e => onChange({ ...data, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
          >
            <option value="easy">Easy (1pt)</option>
            <option value="medium">Medium (2pt)</option>
            <option value="hard">Hard (3pt)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Points</label>
          <input
            type="number" min={1} max={5}
            className="w-16 px-2 py-1.5 rounded border border-gray-200 text-xs focus:outline-none"
            value={data.points ?? 1}
            onChange={e => onChange({ ...data, points: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Order</label>
          <input
            type="number" min={0}
            className="w-16 px-2 py-1.5 rounded border border-gray-200 text-xs focus:outline-none"
            value={data.display_order ?? 0}
            onChange={e => onChange({ ...data, display_order: Number(e.target.value) })}
          />
        </div>
        <div className="flex items-end gap-1">
          <label className="text-xs text-gray-500 mb-1.5">Active</label>
          <input
            type="checkbox"
            className="mb-2"
            checked={data.is_active ?? true}
            onChange={e => onChange({ ...data, is_active: e.target.checked })}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onSave} className="px-4 py-2 rounded-lg bg-accent-marigold text-white text-sm font-semibold hover:opacity-90">
          {saveLabel}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  )
}
