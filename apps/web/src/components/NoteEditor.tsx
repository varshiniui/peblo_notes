"use client"

import { useState, useEffect, useRef, type KeyboardEvent } from "react"
import { apiClient } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Pin, Trash2, Check, Loader2, Sparkles, X, ListTodo, Save, Share2, Copy, Globe, ChevronLeft, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface TagItem {
  id: string
  name: string
  color: string
}

interface Note {
  id: string
  title: string
  content: string
  isPinned: boolean
  isPublic?: boolean
  share?: { shareId: string } | null
  updatedAt: string
  tags?: TagItem[]
}

interface NoteEditorProps {
  note: Note
  onUpdate: (updatedNote: Note) => void
  onDelete: (id: string) => void
  onDeselect: () => void
}

interface AIData {
  summary: string
  action_items: string[]
  suggested_title: string
}

export default function NoteEditor({ note, onUpdate, onDelete, onDeselect }: Readonly<NoteEditorProps>) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [aiData, setAiData] = useState<AIData | null>(null)
  const [aiExpanded, setAiExpanded] = useState(false)

  const [isPublic, setIsPublic] = useState(note.isPublic || false)
  const [shareUrl, setShareUrl] = useState("")
  const [isSharing, setIsSharing] = useState(false)
  const [showShareUI, setShowShareUI] = useState(false)
  const [tags, setTags] = useState<TagItem[]>(note.tags || [])
  const [tagInput, setTagInput] = useState("")

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstRender = useRef(true)

  const createTagPill = (rawTag: string) => {
    const normalized = rawTag.trim().replace(/^[,\s]+|[,\s]+$/g, "")
    if (!normalized) return null
    return {
      id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${normalized}`,
      name: normalized,
      color: "#c4b5fd",
    }
  }

  const normalizeLoadedTags = (loadedTags?: TagItem[]) => {
    return Array.isArray(loadedTags)
      ? loadedTags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          color: tag.color || "#c4b5fd",
        }))
      : []
  }

  const updateNoteTags = async (nextTags: TagItem[]) => {
    try {
      const response = await apiClient.patch<Note>(`/notes/${note.id}`, {
        tags: nextTags.map((tag) => tag.name),
      })
      if (response.data) {
        setTags(normalizeLoadedTags(response.data.tags))
        onUpdate(response.data)
      }
    } catch (error) {
      console.error("Failed to update tags", error)
      toast.error("Unable to save tags")
    }
  }

  const addTag = async (rawValue: string) => {
    const nextTag = createTagPill(rawValue)
    if (!nextTag) return
    const alreadyAdded = tags.some(
      (tag) => tag.name.toLowerCase() === nextTag.name.toLowerCase()
    )
    if (alreadyAdded) return
    const nextTags = [...tags, nextTag]
    setTags(nextTags)
    setTagInput("")
    await updateNoteTags(nextTags)
  }

  const removeTag = async (tagToRemove: TagItem) => {
    const nextTags = tags.filter((tag) => tag.name !== tagToRemove.name)
    setTags(nextTags)
    await updateNoteTags(nextTags)
  }

  const handleTagInputKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      await addTag(tagInput)
    }
  }

  useEffect(() => {
    setTitle(note.title)
    setContent(note.content)
    setTags(normalizeLoadedTags(note.tags))
    setAiData(null)
    setAiExpanded(false)
    setIsPublic(note.isPublic || false)
    setShowShareUI(false)
    isFirstRender.current = true

    if (note.isPublic && note.share?.shareId) {
      const origin = globalThis.location?.origin ?? ""
      setShareUrl(`${origin}/share/${note.share.shareId}`)
    } else {
      setShareUrl("")
    }

    const fetchAISummary = async () => {
      try {
        const response = await apiClient.get<any>(`/ai/summary/${note.id}`)
        const raw = response.data
        const result = raw?.data ?? raw
        if (result && result.summary) {
          setAiData({
            summary: result.summary ?? "",
            action_items: Array.isArray(result.action_items) ? result.action_items : [],
            suggested_title: result.suggested_title ?? "",
          })
          setAiExpanded(false)
        }
      } catch {
        // No summary yet
      }
    }
    fetchAISummary()
  }, [note.id])

  useEffect(() => {
    setIsPublic(note.isPublic || false)
    if (note.isPublic && note.share?.shareId) {
      const origin = globalThis.location?.origin ?? ""
      setShareUrl(`${origin}/share/${note.share.shareId}`)
    } else if (!note.isPublic) {
      setShareUrl("")
    }
  }, [note.isPublic, note.share])

  const handleSave = async (isManual = false) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsSaving(true)
    setShowSaved(false)
    try {
      const response = await apiClient.put<Note>(`/notes/${note.id}`, { title, content })
      if (response.data) {
        onUpdate(response.data)
        setShowSaved(true)
      }
      if (isManual) toast.success("Note saved successfully")
      setTimeout(() => setShowSaved(false), 2000)
    } catch (error) {
      console.error("Save failed", error)
      toast.error("Failed to save note")
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { handleSave() }, 1500)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [title, content, note.id])

  const handleSummarize = async () => {
    if (!content || content.trim() === "") {
      toast.error("Write something first!")
      return
    }
    setIsSummarizing(true)
    try {
      const response = await apiClient.post<any>("/ai/summarize", { noteId: note.id, content })
      const raw = response.data
      const aiResult = raw?.data ?? raw
      setAiData({
        summary: aiResult.summary ?? "",
        action_items: Array.isArray(aiResult.action_items) ? aiResult.action_items : [],
        suggested_title: aiResult.suggested_title ?? "",
      })
      setAiExpanded(true)
      toast.success("AI analysis complete ✨")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Summarization failed"
      toast.error(message)
    } finally {
      setIsSummarizing(false)
    }
  }

  const togglePin = async () => {
    try {
      const response = await apiClient.patch<Note>(`/notes/${note.id}/pin`, {})
      if (response.data) onUpdate(response.data)
    } catch (error) {
      console.error("Pin toggle failed", error)
    }
  }

  const handleShareToggle = async () => {
    if (isPublic) {
      setShowShareUI(!showShareUI)
      return
    }
    setIsSharing(true)
    try {
      const response = await apiClient.post<{ shareUrl: string }>(`/notes/${note.id}/share`, {})
      if (response.data) {
        setIsPublic(true)
        const origin = globalThis.location?.origin ?? ""
        const fullUrl = `${origin}${response.data.shareUrl}`
        setShareUrl(fullUrl)
        setShowShareUI(true)
        toast.success("Share link generated")
        onUpdate({
          ...note,
          isPublic: true,
          share: { shareId: response.data.shareUrl.split("/").pop() || "" },
        })
      }
    } catch {
      toast.error("Failed to generate share link")
    } finally {
      setIsSharing(false)
    }
  }

  const handleStopSharing = async () => {
    setIsSharing(true)
    try {
      await apiClient.delete(`/notes/${note.id}/share`)
      setIsPublic(false)
      setShareUrl("")
      setShowShareUI(false)
      toast.success("Sharing disabled")
      onUpdate({ ...note, isPublic: false, share: null })
    } catch {
      toast.error("Failed to disable sharing")
    } finally {
      setIsSharing(false)
    }
  }

  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      toast.success("Link copied!")
    }
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this note?")) {
      try {
        await apiClient.delete(`/notes/${note.id}`)
        onDelete(note.id)
      } catch (error) {
        console.error("Delete failed", error)
      }
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-background/60 backdrop-blur-sm max-w-4xl mx-auto w-full">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-end p-4 gap-2 border-b border-border/30 relative bg-background/80 backdrop-blur-md">
        <Button
          variant="ghost"
          size="icon"
          onClick={onDeselect}
          className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent absolute left-4"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="mr-auto pl-12">
          {isSaving && (
            <div className="flex items-center gap-2 animate-pulse text-primary bg-primary/10 px-3 py-1.5 rounded-full text-xs font-medium">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Syncing</span>
            </div>
          )}
          {showSaved && (
            <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1.5 rounded-full text-xs font-medium">
              <Check className="h-3 w-3" />
              <span>Saved</span>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSave(true)}
          disabled={isSaving}
          className="text-muted-foreground flex items-center gap-2 h-9 px-4 rounded-xl hover:bg-accent"
        >
          <Save className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Save</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSummarize}
          disabled={isSummarizing}
          className="bg-primary hover:bg-primary/90 text-primary-foreground border-transparent flex items-center gap-2 h-9 px-4 rounded-xl shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
        >
          {isSummarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          <span className="text-xs font-medium uppercase tracking-wider">AI Insights</span>
        </Button>

        <div className="h-5 w-px bg-border/50" />

        <Button
          variant="ghost"
          size="icon"
          onClick={togglePin}
          className={cn("h-9 w-9 rounded-xl transition-all",
            note.isPinned ? "text-primary bg-primary/10" : "text-muted-foreground/40 hover:bg-accent hover:text-muted-foreground"
          )}
        >
          <Pin className={cn("h-4 w-4", note.isPinned && "fill-current")} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleShareToggle}
          disabled={isSharing}
          className={cn("h-9 w-9 rounded-xl transition-all",
            isPublic ? "text-primary bg-primary/10" : "text-muted-foreground/40 hover:bg-accent hover:text-muted-foreground"
          )}
        >
          {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className={cn("h-4 w-4", isPublic && "fill-current")} />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          className="h-9 w-9 rounded-xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Editor */}
      <div className="px-8 md:px-14 py-8 flex flex-col gap-4">

        {/* Share Panel */}
        {showShareUI && isPublic && shareUrl && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Globe className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Public Link Active</p>
                <p className="text-xs text-muted-foreground">Anyone with this link can view the note</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowShareUI(false)} className="h-7 w-7 rounded-full flex-shrink-0">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-2 bg-card p-2 pl-3 rounded-xl border border-border">
              <span className="flex-1 text-xs text-muted-foreground truncate font-mono">{shareUrl}</span>
              <Button size="sm" onClick={copyShareLink} className="bg-primary text-white rounded-lg px-3 h-7 text-xs gap-1 flex-shrink-0">
                <Copy className="h-3 w-3" /> Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={handleStopSharing} disabled={isSharing} className="text-destructive hover:bg-destructive/10 rounded-lg px-3 h-7 text-xs gap-1 flex-shrink-0">
                <X className="h-3 w-3" /> Stop
              </Button>
            </div>
          </div>
        )}

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New thought..."
          className="text-2xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/20 text-foreground w-full"
        />

        {/* Tags */}
        <div className="flex flex-wrap gap-2 items-center">
          {tags.map((tag) => (
            <span key={tag.name} className="inline-flex items-center gap-1.5 rounded-full bg-violet-100/90 dark:bg-violet-500/20 text-violet-700 dark:text-violet-100 px-3 py-1 text-xs font-medium border border-violet-200/70 dark:border-violet-500/40">
              {tag.name}
              <button type="button" onClick={() => removeTag(tag)} className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-violet-200 dark:hover:bg-violet-500/40">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            placeholder="Add tags..."
            className="min-w-[120px] bg-transparent border border-border/50 focus:border-primary rounded-xl px-3 py-1.5 text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* ✨ AI Insights Panel — shown directly below tags */}
        {aiData && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
            <button
              onClick={() => setAiExpanded((s) => !s)}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
            >
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              <span>AI Insights</span>
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse ml-1" />
              <span className="ml-auto">
                {aiExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>

            {aiExpanded && (
              <div className="px-4 pb-5 space-y-4 border-t border-primary/10 pt-3">
                <p className="text-sm text-foreground/80 leading-relaxed italic">
                  {aiData.summary}
                </p>

                {aiData.action_items && aiData.action_items.length > 0 && (
                  <div className="bg-muted/40 p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-wider mb-3">
                      <ListTodo className="h-3.5 w-3.5" />
                      <span>Action Items</span>
                    </div>
                    <ul className="space-y-2">
                      {aiData.action_items.map((item) => (
                        <li key={item} className="flex gap-3 text-sm text-foreground/70">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiData.suggested_title && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Suggested Title</p>
                    <button
                      onClick={() => setTitle(aiData.suggested_title)}
                      className="group flex items-center gap-2 text-sm text-primary font-medium italic bg-primary/5 hover:bg-primary/10 px-3 py-2 rounded-xl border border-primary/20 transition-all"
                    >
                      &quot;{aiData.suggested_title}&quot;
                      <span className="text-xs opacity-0 group-hover:opacity-60 transition-opacity">(click to apply)</span>
                    </button>
                  </div>
                )}

                <button onClick={() => setAiData(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Clear insights
                </button>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-border/50 via-border/20 to-transparent opacity-50" />

        {/* Note Content */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Let your creativity flow..."
          className="w-full min-h-[600px] text-base leading-relaxed bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/20 text-foreground/80 font-normal"
        />
      </div>
    </div>
  )
}