import { Router } from 'express';
import prisma from '../lib/prisma.js';
const router = Router();
// GET /shared/:shareId - Get a public shared note
router.get('/:shareId', async (req, res) => {
    try {
        const shareId = req.params['shareId'];
        const share = await prisma.share.findUnique({
            where: { shareId },
            include: {
                note: true,
                user: {
                    select: {
                        name: true,
                    }
                }
            },
        });
        if (!share) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }
        if (!share.note || !share.note.isPublic) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }
        res.json({
            success: true,
            data: {
                title: share.note.title,
                content: share.note.content,
                createdAt: share.note.createdAt,
                updatedAt: share.note.updatedAt,
                authorName: share.user.name,
            },
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
    }
});
export default router;
//# sourceMappingURL=shared.js.map