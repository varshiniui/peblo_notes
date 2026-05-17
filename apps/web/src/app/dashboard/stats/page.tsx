"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api"
import { FileText, Pin, Share2, Sparkles, Clock, AlertCircle, TrendingUp, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import DashboardShell from "@/components/DashboardShell"

interface NoteStats {
  totalNotes: number
  pinnedNotes: number
  sharedNotes: number
  aiGenerations: number
  recentNotes: {
    id: string
    title: string
    updatedAt: string
  }[]
  notesPerDay: {
    date: string
    count: number
  }[]
  topTags: {
    name: string
    color: string
    count: number
  }[]
}

interface AIHistoryItem {
  id: string
  noteId: string
  noteTitle: string
  summary: string
  action_items: string[]
  suggested_title: string
  createdAt: string
}

interface Note {
  id: string
  title: string
  content: string
  isPinned: boolean
  isPublic?: boolean
  share?: { shareId: string } | null
  updatedAt: string
}

function getRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} minutes ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hours ago`
  if (hrs < 48) return "Yesterday"
  return `${Math.floor(hrs / 24)} days ago`
}

// ── Extracted to avoid nested ternary (SonarQube) ──
function getBarClass(isHighest: boolean): string {
  if (isHighest) return "w-full max-w-[40px] rounded-t-lg transition-all duration-500 bg-primary"
  return "w-full max-w-[40px] rounded-t-lg transition-all duration-500 bg-primary/40"
}

interface StatCardProps {
  readonly icon: React.ReactNode
  readonly label: string
  readonly value: number
  readonly iconBg: string
}

function StatCard({ icon, label, value, iconBg }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm p-5 flex flex-col gap-4 hover:border-border transition-colors hover:shadow-sm">
      {/* Icon — standalone, not next to label */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      {/* Value + Label stacked — label never truncates */}
      <div>
        <p className="text-3xl font-bold text-foreground tabular-nums leading-none">{value}</p>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1.5">{label}</p>
      </div>
    </div>
  )
}

export default function StatsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<NoteStats | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [aiHistory, setAiHistory] = useState<AIHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    void (async () => {
      try {
        setIsLoading(true)
        const [statsRes, notesRes, aiHistoryRes] = await Promise.all([
          apiClient.get<NoteStats>("/stats"),
          apiClient.get<Note[]>("/notes"),
          apiClient.get<AIHistoryItem[]>("/ai/history"),
        ])
        if (!statsRes.data) {
          setError("Failed to load statistics")
          return
        }
        setStats(statsRes.data)
        setNotes(notesRes.data ?? [])
        setAiHistory(aiHistoryRes.data ?? [])
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "An error occurred"
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  const shellProps = {
    notes,
    selectedNoteId: null,
    onSelectNote: () => {},
    onCreateNote: () => {},
    searchQuery,
    onSearchChange: setSearchQuery,
    isLoading,
  }

  if (isLoading) {
    return (
      <DashboardShell {...shellProps}>
        <div className="flex-1 p-8 md:p-12 overflow-y-auto w-full max-w-5xl mx-auto space-y-10 animate-pulse">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted/50 rounded-lg" />
            <div className="h-4 w-64 bg-muted/30 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted/20 rounded-2xl border border-border/30" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-80 bg-muted/20 rounded-2xl border border-border/30" />
            <div className="h-80 bg-muted/20 rounded-2xl border border-border/30" />
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (error) {
    return (
      <DashboardShell {...shellProps}>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Unable to load analytics</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </DashboardShell>
    )
  }

  if (!stats) return null

  const maxCount = Math.max(...stats.notesPerDay.map((d) => d.count), 1)

  return (
    <DashboardShell {...shellProps}>
      <div className="flex-1 p-8 md:p-12 overflow-y-auto w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-2">
            Workspace Analytics
          </h1>
          <p className="text-muted-foreground font-medium">
            Insights and activity across your productivity hub
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            icon={<FileText className="h-5 w-5 text-violet-400" />}
            label="Total Notes"
            value={stats.totalNotes}
            iconBg="bg-violet-500/10"
          />
          <StatCard
            icon={<Pin className="h-5 w-5 text-pink-400" />}
            label="Pinned Notes"
            value={stats.pinnedNotes}
            iconBg="bg-pink-500/10"
          />
          <StatCard
            icon={<Share2 className="h-5 w-5 text-cyan-400" />}
            label="Shared Notes"
            value={stats.sharedNotes}
            iconBg="bg-cyan-500/10"
          />
          <StatCard
            icon={<Sparkles className="h-5 w-5 text-amber-400" />}
            label="AI Summaries"
            value={stats.aiGenerations}
            iconBg="bg-amber-500/10"
          />
        </div>

        {/* Most Used Tags */}
        {stats.topTags && stats.topTags.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-foreground tracking-tight mb-4">
              Most Used Tags
            </h2>
            <div className="flex flex-wrap gap-3">
              {stats.topTags.map((tag) => (
                <div
                  key={tag.name}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all hover:shadow-md border border-border/50"
                  style={{
                    backgroundColor: `${tag.color}15`,
                    borderColor: `${tag.color}40`,
                    color: tag.color,
                  }}
                >
                  <span>{tag.name}</span>
                  <span className="ml-1 opacity-70">({tag.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart + Recent Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Activity Chart */}
          <div className="lg:col-span-2 bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 p-6">
            <div className="flex items-center gap-2 mb-8">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                Activity (Last 7 Days)
              </h3>
            </div>

            <div className="h-48 flex items-end justify-between gap-2 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-full h-px bg-border/30" />
                ))}
              </div>

              {stats.notesPerDay.map((day) => {
                const isHighest = day.count === maxCount && day.count > 0
                const barClass = getBarClass(isHighest)
                // Always render a visible bar — min 8px so chart never looks broken
                const heightPct = day.count === 0
                  ? 6
                  : Math.max(10, Math.round((day.count / maxCount) * 100))

                return (
                  <div key={day.date} className="flex flex-col items-center flex-1 z-10 group h-full">
                    <div className="w-full flex justify-center items-end flex-1 relative">
                      {/* Tooltip */}
                      <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-xs font-semibold px-2 py-1 rounded-md pointer-events-none shadow-lg whitespace-nowrap">
                        {day.count} notes
                      </div>
                      <div
                        className={barClass}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground mt-3 uppercase tracking-wider">
                      {day.date}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/30">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-sm bg-primary" />
                <span className="text-[10px] text-muted-foreground">Peak day</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-sm bg-primary/40" />
                <span className="text-[10px] text-muted-foreground">Other days</span>
              </div>
            </div>
          </div>

          {/* Recent Notes */}
          <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                Recent Updates
              </h3>
            </div>

            <div className="flex-1 flex flex-col gap-3">
              {stats.recentNotes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground py-8">
                  <Clock className="h-8 w-8 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No recent activity</p>
                </div>
              ) : (
                stats.recentNotes.map((note) => (
                  <div
                    key={note.id}
                    className="group flex flex-col gap-1 p-3 -mx-3 rounded-xl hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors truncate">
                      {note.title || "Untitled Draft"}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Clock className="h-3 w-3" />
                      <span>{getRelativeTime(note.updatedAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* AI History Section */}
        {aiHistory.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground tracking-tight">
                AI Generation History
              </h2>
            </div>

            <div className="space-y-3">
              {aiHistory.map((item) => {
                // Truncate summary to 2 lines (~100 characters)
                const truncatedSummary = item.summary.length > 100
                  ? item.summary.substring(0, 100) + "..."
                  : item.summary

                return (
                  <div
                    key={item.id}
                    className="group bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 p-5 hover:border-border/80 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground mb-2 truncate text-sm">
                          {item.noteTitle || "Untitled Draft"}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {truncatedSummary}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                          <Clock className="h-3 w-3" />
                          <span>{getRelativeTime(item.createdAt)}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          router.push(`/dashboard?noteId=${item.noteId}`)
                        }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-3 h-9 flex items-center gap-2 transition-all whitespace-nowrap flex-shrink-0"
                      >
                        <span className="text-xs font-medium">View Note</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}