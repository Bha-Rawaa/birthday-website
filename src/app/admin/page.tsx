'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Memory } from '@/lib/types'

const PERSON_NAME = process.env.NEXT_PUBLIC_PERSON_NAME ?? 'the birthday star'

interface AdminMemory extends Memory {
  signedUrl?: string
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

  useEffect(() => {
    if (authed) {
      fetchMemories()
      fetchVisitors()
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
            <button onClick={() => { fetchMemories(); fetchVisitors() }}
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
          <div className="space-y-4">
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
      </div>
    </div>
  )
}
