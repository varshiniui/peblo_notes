"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  LogOut, 
  Settings, 
  Menu, 
  X, 
  Search,
  StickyNote,
  ChevronRight,
  Clock,
  BarChart2,
  Moon, 
  Sun
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

interface Note {
  id: string
  title: string
  content: string
  isPinned: boolean
  isPublic?: boolean
  share?: { shareId: string } | null
  updatedAt: string
}

interface DashboardShellProps {
  readonly notes: Note[]
  readonly selectedNoteId: string | null
  readonly onSelectNote: (id: string | null) => void
  readonly onCreateNote: () => void
  readonly searchQuery: string
  readonly onSearchChange: (query: string) => void
  readonly children: React.ReactNode
  readonly isLoading?: boolean
}

export default function DashboardShell({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  searchQuery,
  onSearchChange,
  children,
  isLoading = false,
}: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans antialiased text-foreground">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 z-20">
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="rounded-full hover:bg-accent/50">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="ml-3 font-bold text-lg text-primary tracking-tight">Peblo</div>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-opacity duration-300 cursor-default"
          onClick={() => setIsSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsSidebarOpen(false)
          }}
          aria-label="Close navigation"
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 w-[300px] bg-muted/30 border-r border-border/50 z-40 transition-all duration-500 transform flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Sidebar Header */}
        <div className="p-8 pb-6 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              onSelectNote(null)
              setIsSidebarOpen(false)
              router.push('/dashboard')
            }}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            aria-label="Go to dashboard home"
          >
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/10">
              <StickyNote className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-foreground">Peblo</span>
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest -mt-1">Workspace</span>
            </div>
          </button>
          <div className="flex items-center gap-1">
            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-accent transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark
                ? <Sun className="h-4 w-4 text-yellow-400" />
                : <Moon className="h-4 w-4 text-indigo-400" />
              }
            </button>
            <Button variant="ghost" size="icon" className="lg:hidden rounded-full h-8 w-8 hover:bg-accent" onClick={() => setIsSidebarOpen(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* New Note Button */}
        <div className="px-6 mb-8 mt-2 flex-shrink-0">
          <Button 
            className="w-full bg-card hover:bg-primary hover:text-primary-foreground text-primary border border-border shadow-sm flex items-center gap-2 justify-center py-6 rounded-[1rem] transition-all duration-300 group font-medium active:scale-[0.98]"
            onClick={() => {
              onCreateNote()
              setIsSidebarOpen(false)
            }}
          >
            <div className="bg-primary/10 group-hover:bg-primary-foreground/20 p-1.5 rounded-xl transition-colors">
              <Plus className="h-4 w-4" />
            </div>
            <span className="tracking-tight">Create new note</span>
          </Button>
        </div>

        {/* Search */}
        <div className="px-6 mb-6 flex-shrink-0">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Search your thoughts..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-background/50 hover:bg-background focus:bg-card focus:ring-4 focus:ring-primary/10 border border-border/50 rounded-2xl pl-11 pr-4 py-3 text-[13px] outline-none transition-all placeholder:text-muted-foreground/40 text-foreground font-medium"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-1.5 scrollbar-none">
          <div className="px-4 mb-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">Library</span>
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{filteredNotes.length}</span>
          </div>

          {isLoading ? (
            <div className="px-6 py-6 space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={`skeleton-${idx}`} className="h-4 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="px-6 py-20 text-center flex flex-col items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                <Search className="h-5 w-5 text-muted-foreground/30" />
              </div>
              <p className="text-[11px] text-muted-foreground/50 font-semibold tracking-wide uppercase">No notes discovered</p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => {
                  onSelectNote(note.id)
                  setIsSidebarOpen(false)
                  router.push('/dashboard')
                }}
                className={cn(
                  "w-full text-left group px-5 py-4 rounded-[1.25rem] cursor-pointer transition-all duration-300 flex flex-col gap-2 relative overflow-hidden",
                  selectedNoteId === note.id 
                    ? "bg-card shadow-sm ring-1 ring-border scale-[1.02]" 
                    : "hover:bg-accent/40 active:scale-95"
                )}
              >
                {selectedNoteId === note.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-r-full" />
                )}
                <div className="flex items-center justify-between gap-3">
                  <span className={cn(
                    "text-[13px] font-medium truncate leading-tight tracking-tight",
                    selectedNoteId === note.id ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {note.title || "Untitled Draft"}
                  </span>
                  {note.isPinned && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-md bg-muted flex items-center justify-center">
                    <Clock className="h-2.5 w-2.5 text-muted-foreground/60" />
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">
                    {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-border/30 bg-muted/20 flex-shrink-0">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 p-2 hover:bg-accent rounded-2xl transition-all duration-300 cursor-pointer group">
              <div className="h-10 w-10 rounded-[1rem] bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-semibold text-sm shadow-md shadow-primary/10 transition-transform group-hover:scale-105">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate leading-none mb-1.5">{user?.name || "Explorer"}</p>
                <p className="text-[10px] text-muted-foreground font-medium tracking-tight truncate">{user?.email}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-all transform group-hover:translate-x-1" />
            </div>
            
            <div className="flex items-center gap-2">
              <Link href="/dashboard/stats" className="flex-1">
                <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary-foreground hover:bg-primary justify-start gap-2.5 h-10 rounded-xl font-medium transition-all border border-border bg-card">
                  <BarChart2 className="h-4 w-4" />
                  <span className="text-[11px] uppercase tracking-wider font-bold">Analytics</span>
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent h-10 w-10 rounded-xl transition-all flex-shrink-0">
                <Settings className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 w-10 rounded-xl transition-all flex-shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  )
}