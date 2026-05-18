"use client"

import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api"
import NoteEditor from "@/components/NoteEditor"
import DashboardShell from "@/components/DashboardShell"
import { StickyNote, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface Note {
  id: string
  title: string
  content: string
  isPinned: boolean
  isPublic?: boolean
  share?: { shareId: string } | null
  updatedAt: string
}

// Define the type for the API response
  interface DashboardStatsResponse {
    data: {
      topTags: { name: string; color: string; count: number }[];
    };
  }

export default function DashboardPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const [topTags, setTopTags] = useState<{ name: string; color: string; count: number }[]>([])

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    try {
      const response = await apiClient.get<Note[]>("/notes")
      const data = response.data || []
      setNotes(data)
    } catch (error) {
      console.error("Failed to fetch notes", error)
    } finally {
      setIsInitialLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await apiClient.get<DashboardStatsResponse>("/dashboard/stats");
      const data = response.data?.data?.topTags || [];
      setTopTags(data);
    } catch (error) {
      console.error("Failed to fetch dashboard stats", error);
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleCreateNote = useCallback(async () => {
    try {
      const response = await apiClient.post<Note>("/notes", { title: "", content: "" })
      if (response.data) {
        setNotes([response.data, ...notes])
        setSelectedNoteId(response.data.id)
        toast.success("Note created")
      }
    } catch (error) {
      console.error("Failed to create note", error)
    }
  }, [notes])

  // Keyboard shortcut: Ctrl+N to create a new note
  const handleCreateNoteShortcut = useCallback(() => {
    handleCreateNote()
  }, [handleCreateNote])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return
        e.preventDefault()
        handleCreateNoteShortcut()
      }
    }
    globalThis.addEventListener('keydown', handler)
    return () => globalThis.removeEventListener('keydown', handler)
  }, [handleCreateNoteShortcut])

  const handleUpdateNote = (updatedNote: Note) => {
    setNotes(prevNotes => {
      const newNotes = prevNotes.map(n => n.id === updatedNote.id ? updatedNote : n)
      return [...newNotes].sort((a, b) => {
        if (a.isPinned === b.isPinned) {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        }
        return a.isPinned ? -1 : 1
      })
    })
  }

  const handleDeleteNote = (id: string) => {
    setNotes(prevNotes => {
      const filtered = prevNotes.filter(n => n.id !== id)
      if (selectedNoteId === id) {
        setSelectedNoteId(filtered.length > 0 ? filtered[0].id : null)
      }
      return filtered
    })
  }

  const selectedNote = notes.find(n => n.id === selectedNoteId)

  const getContrastColor = (hex: string) => {
    if (!hex?.startsWith("#")) return "#fff"
    let color = hex.slice(1)
    if (color.length === 3) {
      color = color.split("").map((char) => char + char).join("")
    }
    const red = Number.parseInt(color.slice(0, 2), 16)
    const green = Number.parseInt(color.slice(2, 4), 16)
    const blue = Number.parseInt(color.slice(4, 6), 16)
    return (red * 0.299 + green * 0.587 + blue * 0.114) > 186 ? "#111" : "#fff"
  }

  if (isInitialLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="h-16 w-16 rounded-[2rem] bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-2xl shadow-primary/20 animate-pulse">
            <StickyNote className="h-8 w-8 text-white" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-primary font-bold tracking-widest text-xl">PEBLO</div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.3em]">Personal Workspace</div>
          </div>
        </div>
      </div>
    )
  }

  const renderMainContent = () => {
    if (selectedNote) {
      return (
        <NoteEditor 
          key={selectedNote.id}
          note={selectedNote} 
          onUpdate={handleUpdateNote}
          onDelete={handleDeleteNote}
          onDeselect={() => setSelectedNoteId(null)}
        />
      )
    }

    if (notes.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center px-10 text-center animate-in fade-in duration-500">
          <svg width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="15" width="120" height="90" rx="8" stroke="currentColor" strokeWidth="2" strokeOpacity="0.06" />
            <path d="M30 35h80" stroke="currentColor" strokeWidth="2" strokeOpacity="0.06" />
            <path d="M30 55h80" stroke="currentColor" strokeWidth="2" strokeOpacity="0.06" />
            <path d="M30 75h50" stroke="currentColor" strokeWidth="2" strokeOpacity="0.06" />
          </svg>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Select a note or create one</h2>
          <p className="text-muted-foreground mb-6">Start capturing ideas, then come back here for insights.</p>
          <Button className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 rounded-2xl shadow-md" onClick={handleCreateNote}>
            Create Note
          </Button>
        </div>
      )
    }

    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center animate-in fade-in duration-1000">
        <div className="max-w-md w-full space-y-8">
          {/* Icon Container */}
          <div className="flex justify-center pt-12">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative p-5 rounded-xl bg-gradient-to-br from-primary/8 to-primary/3 border border-primary/10 backdrop-blur-sm">
                <StickyNote className="h-12 w-12 text-primary/60" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-2">Start your journey</h2>
              <div className="h-1 w-16 bg-gradient-to-r from-primary/60 to-primary/20 mx-auto rounded-full mb-4" />
            </div>
            <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed text-base">
              Create your first note and discover the power of capturing ideas in one beautiful space.
            </p>
          </div>

          {/* CTA Button */}
          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95 group"
            onClick={handleCreateNote}
          >
            <Plus className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
            <span>Create Your First Note</span>
          </Button>

          {/* Tags Preview */}
          {topTags.length > 0 && (
            <div className="pt-4 border-t border-border/30">
              <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-semibold">Popular topics</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {topTags.slice(0, 5).map((tag) => (
                  <span
                    key={tag.name}
                    className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium border border-current border-opacity-10"
                    style={{
                      backgroundColor: tag.color + '15',
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <DashboardShell
      notes={notes}
      selectedNoteId={selectedNoteId}
      onSelectNote={setSelectedNoteId}
      onCreateNote={handleCreateNote}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      isLoading={isInitialLoading}
    >
      <div className="p-4 h-full min-h-[calc(100vh-4rem)]">
        <div className="mx-auto max-w-5xl">
          {renderMainContent()}
        </div>
      </div>
    </DashboardShell>
  )
}
