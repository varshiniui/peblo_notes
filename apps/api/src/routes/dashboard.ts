import { Router } from 'express';
import type { Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const [totalNotes, archivedNotes, totalTags, aiGenerations, recentNotes] = await Promise.all([
      prisma.note.count({ where: { userId } }),
      prisma.note.count({ where: { userId, archived: true } }),
      prisma.tag.count({ where: { userId } }),
      prisma.aIGeneration.count({ where: { userId } }),
      prisma.note.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, updatedAt: true },
      }),
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const notesForChart = await prisma.note.findMany({
      where: {
        userId,
        OR: [
          { createdAt: { gte: sevenDaysAgo } },
          { updatedAt: { gte: sevenDaysAgo } },
        ],
      },
      select: { createdAt: true, updatedAt: true },
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyActivity = [];

    for (let index = 6; index >= 0; index -= 1) {
      const currentDay = new Date();
      currentDay.setDate(currentDay.getDate() - index);
      currentDay.setHours(0, 0, 0, 0);

      const count = notesForChart.filter((note) => {
        const createdDate = new Date(note.createdAt);
        const updatedDate = new Date(note.updatedAt);

        const isCreatedOnDay =
          createdDate.getDate() === currentDay.getDate() &&
          createdDate.getMonth() === currentDay.getMonth() &&
          createdDate.getFullYear() === currentDay.getFullYear();

        const isUpdatedOnDay =
          updatedDate.getDate() === currentDay.getDate() &&
          updatedDate.getMonth() === currentDay.getMonth() &&
          updatedDate.getFullYear() === currentDay.getFullYear();

        return isCreatedOnDay || isUpdatedOnDay;
      }).length;

      weeklyActivity.push({
        date: dayNames[currentDay.getDay()],
        count,
      });
    }

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

    const tagIds = tagUsage.map((usage) => usage.tagId);
    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
    });

    const topTags = tagUsage.map((usage) => {
      const tag = tags.find((item) => item.id === usage.tagId);
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
        archivedNotes,
        totalTags,
        aiGenerations,
        recentNotes,
        topTags,
        weeklyActivity,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
