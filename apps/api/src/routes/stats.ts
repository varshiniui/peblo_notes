import { Router } from 'express';
import type { Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const [totalNotes, pinnedNotes, sharedNotes, aiGenerations, recentNotes] = await Promise.all([
      prisma.note.count({ where: { userId } }),
      prisma.note.count({ where: { userId, isPinned: true } }),
      prisma.note.count({ where: { userId, isPublic: true } }),
      prisma.aIGeneration.count({ where: { userId } }),
      prisma.note.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, updatedAt: true }
      })
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const notesForChart = await prisma.note.findMany({
      where: { 
        userId,
        OR: [
          { createdAt: { gte: sevenDaysAgo } },
          { updatedAt: { gte: sevenDaysAgo } }
        ]
      },
      select: { createdAt: true, updatedAt: true }
    });

    const notesPerDay = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = dayNames[d.getDay()];
      
      const count = notesForChart.filter(note => {
        const createdDate = new Date(note.createdAt);
        const updatedDate = new Date(note.updatedAt);
        const isCreatedOnDay = createdDate.getDate() === d.getDate() && 
               createdDate.getMonth() === d.getMonth() && 
               createdDate.getFullYear() === d.getFullYear();
        const isUpdatedOnDay = updatedDate.getDate() === d.getDate() && 
               updatedDate.getMonth() === d.getMonth() && 
               updatedDate.getFullYear() === d.getFullYear();
        return isCreatedOnDay || isUpdatedOnDay;
      }).length;

      notesPerDay.push({ date: dayName, count });
    }

    // Get top 5 tags by usage count
    const tagUsage = await prisma.noteTag.groupBy({
      by: ['tagId'],
      where: {
        note: {
          userId,
        },
      },
      _count: {
        noteId: true,
      },
      orderBy: {
        _count: {
          noteId: 'desc',
        },
      },
      take: 5,
    });

    // Fetch tag details for the top tags
    const tagIds = tagUsage.map(t => t.tagId);
    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
    });

    const topTags = tagUsage.map(usage => {
      const tag = tags.find(t => t.id === usage.tagId);
      return {
        name: tag?.name || 'Unknown',
        color: tag?.color || '#6366f1',
        count: usage._count.noteId,
      };
    });

    res.json({
      success: true,
      data: {
        totalNotes,
        pinnedNotes,
        sharedNotes,
        aiGenerations,
        recentNotes,
        notesPerDay,
        topTags,
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
