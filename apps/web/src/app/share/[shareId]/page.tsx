"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { apiClient } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowRight, Sparkles } from "lucide-react"

interface SharedNote {
  title: string
  content: string
  createdAt: string
  updatedAt: string
  authorName: string
}

export default function SharedNotePage() {
  const params = useParams()
  const shareId = params?.shareId
  const router = useRouter()
  
  const [note, setNote] = useState<SharedNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const { data } = await apiClient.get<SharedNote>(`/shared/${shareId}`)
        if (data) {
          setNote(data)
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    if (shareId) {
      fetchNote()
    }
  }, [shareId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9fc] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (error || !note) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#faf9fc] to-[#f4f3f7] flex flex-col items-center justify-center gap-6">
        <div className="p-5 bg-indigo-100 rounded-[2rem] shadow-sm shadow-indigo-100/50">
          <Sparkles className="h-10 w-10 text-indigo-500" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-indigo-950 mb-3 tracking-tight">Note not found</h1>
          <p className="text-indigo-900/60 font-medium">This link may be invalid or the note is no longer public.</p>
        </div>
        <Button onClick={() => router.push("/login")} variant="default" className="mt-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 px-8 h-12">
          Return to Peblo
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf9fc] flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="h-20 border-b border-indigo-100/50 bg-white/60 backdrop-blur-xl sticky top-0 z-10 flex items-center px-6 md:px-12 justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center justify-center text-white font-bold text-xl">
            P
          </div>
          <span className="font-extrabold text-indigo-950 tracking-tight text-xl">Peblo</span>
        </div>
        
        <Button 
          onClick={() => router.push("/login")}
          variant="outline" 
          className="rounded-2xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 transition-all duration-300 flex items-center gap-2 h-10 px-5 shadow-sm"
        >
          <span className="text-sm font-semibold tracking-wide">Open in Peblo</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </header>

      {/* Note Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16 md:py-24 flex flex-col gap-10">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-indigo-950 tracking-tight leading-tight">
            {note.title || "Untitled"}
          </h1>
          
          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px] uppercase">
                {note.authorName ? note.authorName.charAt(0) : "A"}
              </div>
              <span className="text-indigo-900/80">{note.authorName || "Anonymous"}</span>
            </div>
            <span className="h-1 w-1 rounded-full bg-indigo-200" />
            <span className="text-indigo-900/50">{new Date(note.updatedAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-indigo-100 via-indigo-100/50 to-transparent w-full" />

        <div className="prose prose-indigo prose-lg max-w-none text-indigo-950/80 leading-relaxed whitespace-pre-wrap font-medium">
          {note.content}
        </div>
      </main>
    </div>
  )
}
