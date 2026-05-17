import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { nanoid } from 'nanoid';
const router = Router();
const mapNoteWithTags = (note) => ({
    ...note,
    tags: note.tags?.map((noteTag) => noteTag.tag) ?? [],
});
// GET /notes - Get all notes for the logged-in user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const notes = await prisma.note.findMany({
            where: { userId },
            orderBy: [
                { isPinned: 'desc' },
                { updatedAt: 'desc' },
            ],
            include: {
                share: true,
                tags: {
                    include: {
                        tag: true,
                    },
                },
            },
        });
        res.json({ success: true, data: notes.map(mapNoteWithTags) });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
    }
});
// GET /notes/:id - Get a single note by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const id = req.params['id'];
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const note = await prisma.note.findFirst({
            where: { id, userId },
            include: {
                share: true,
                tags: {
                    include: {
                        tag: true,
                    },
                },
            },
        });
        if (!note) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }
        res.json({ success: true, data: note });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
    }
});
// GET /notes/:id/summary - Get the last AI summary for a note
router.get('/:id/summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const noteId = req.params['id'];
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        // Verify the note belongs to the user
        const note = await prisma.note.findFirst({
            where: { id: noteId, userId },
        });
        if (!note) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }
        // Get the last AI summary generation for this note
        const aiGeneration = await prisma.aIGeneration.findFirst({
            where: { noteId, type: "summary" },
            orderBy: { createdAt: 'desc' },
        });
        if (!aiGeneration) {
            return res.json({ success: true, data: null });
        }
        // Parse and return the AI generation result
        const result = JSON.parse(aiGeneration.result);
        res.json({
            success: true,
            data: {
                summary: result.summary || '',
                action_items: result.action_items || [],
                suggested_title: result.suggested_title || '',
            }
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
    }
});
// POST /notes - Create a new note
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { title, content } = req.body;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const note = await prisma.note.create({
            data: {
                title: title || 'Untitled',
                content: content || '',
                userId,
            },
        });
        res.status(201).json({ success: true, data: note });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
    }
});
// PUT /notes/:id - Update a note
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const id = req.params['id'];
        const { title, content, isPinned } = req.body;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const note = await prisma.note.findFirst({
            where: { id, userId },
        });
        if (!note) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }
        const updatedNote = await prisma.note.update({
            where: { id },
            data: {
                title: title ?? note.title,
                content: content ?? note.content,
                isPinned: isPinned ?? note.isPinned,
            },
            include: {
                share: true,
                tags: {
                    include: {
                        tag: true,
                    },
                },
            },
        });
        res.json({ success: true, data: mapNoteWithTags(updatedNote) });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
    }
});
// PATCH /notes/:id - Update tags for a note
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const id = req.params['id'];
        const { tags } = req.body;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        if (!Array.isArray(tags)) {
            return res.status(400).json({ success: false, error: 'Tags must be an array' });
        }
        const note = await prisma.note.findFirst({
            where: { id, userId },
        });
        if (!note) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }
        const normalizedTagNames = Array.from(new Set(tags
            .map((tagName) => typeof tagName === 'string' ? tagName.trim() : '')
            .filter((tagName) => tagName !== '')));
        const existingTags = await prisma.tag.findMany({
            where: {
                userId,
                name: {
                    in: normalizedTagNames,
                },
            },
        });
        const existingNames = new Set(existingTags.map((tag) => tag.name.toLowerCase()));
        const newTagNames = normalizedTagNames.filter((name) => !existingNames.has(name.toLowerCase()));
        const createdTags = await Promise.all(newTagNames.map((name) => prisma.tag.create({
            data: {
                name,
                color: '#c4b5fd',
                userId,
            },
        })));
        const allTags = [...existingTags, ...createdTags];
        const currentNoteTags = await prisma.noteTag.findMany({
            where: { noteId: id },
        });
        const targetTagIds = new Set(allTags.map((tag) => tag.id));
        const currentTagIds = new Set(currentNoteTags.map((noteTag) => noteTag.tagId));
        const tagsToRemove = currentNoteTags.filter((noteTag) => !targetTagIds.has(noteTag.tagId));
        const tagsToAdd = allTags.filter((tag) => !currentTagIds.has(tag.id));
        await prisma.$transaction([
            ...tagsToRemove.map((noteTag) => prisma.noteTag.delete({
                where: { noteId_tagId: { noteId: id, tagId: noteTag.tagId } },
            })),
            ...tagsToAdd.map((tag) => prisma.noteTag.create({
                data: { noteId: id, tagId: tag.id },
            })),
        ]);
        const updatedNote = await prisma.note.findFirst({
            where: { id, userId },
            include: {
                share: true,
                tags: {
                    include: { tag: true },
                },
            },
        });
        if (!updatedNote) {
            return res.status(404).json({ success: false, error: 'Note not found after update' });
        }
        res.json({ success: true, data: mapNoteWithTags(updatedNote) });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
    }
});
// DELETE /notes/:id - Delete a note
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const id = req.params['id'];
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const note = await prisma.note.findFirst({
            where: { id, userId },
        });
        if (!note) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }
        await prisma.note.delete({
            where: { id },
        });
        res.json({ success: true, data: { message: 'Note deleted' } });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
    }
});
// PATCH /notes/:id/pin - Toggle isPinned
router.patch('/:id/pin', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const id = req.params['id'];
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const note = await prisma.note.findFirst({
            where: { id, userId },
        });
        if (!note) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }
        const updatedNote = await prisma.note.update({
            where: { id },
            data: {
                isPinned: !note.isPinned,
            },
        });
        res.json({ success: true, data: updatedNote });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
    }
});
// POST /notes/:id/share - Create a public share link
router.post('/:id/share', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const noteId = req.params['id'];
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const note = await prisma.note.findFirst({
            where: { id: noteId, userId },
        });
        if (!note) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }
        await prisma.note.update({
            where: { id: noteId },
            data: { isPublic: true },
        });
        let share = await prisma.share.findFirst({
            where: { noteId },
        });
        if (!share) {
            share = await prisma.share.create({
                data: {
                    shareId: nanoid(10),
                    noteId: noteId,
                    userId: userId,
                },
            });
        }
        if (!share) {
            return res.status(500).json({ success: false, error: 'Failed to create share link' });
        }
        res.json({ success: true, data: { shareUrl: `/share/${share.shareId}` } });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
    }
});
// DELETE /notes/:id/share - Delete a public share link
router.delete('/:id/share', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const noteId = req.params['id'];
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const note = await prisma.note.findFirst({
            where: { id: noteId, userId },
        });
        if (!note) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }
        await prisma.note.update({
            where: { id: noteId },
            data: { isPublic: false },
        });
        await prisma.share.deleteMany({
            where: { noteId },
        });
        res.json({ success: true, data: { message: 'Share link removed' } });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
    }
});
export default router;
//# sourceMappingURL=notes.js.map