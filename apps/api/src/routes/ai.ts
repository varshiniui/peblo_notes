import { Router } from 'express';
import type { Response } from 'express';
import OpenAI from 'openai';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';

const router = Router();

// Initialize OpenAI client for OpenRouter with required headers
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Peblo Notes",
  }
});

// POST /ai/summarize
router.post('/summarize', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ success: false, error: 'OPENROUTER_API_KEY is not configured in .env' });
    }

    const userId = req.user?.userId;
    const { noteId, content } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!noteId) {
      return res.status(400).json({ success: false, error: 'noteId is required' });
    }

    // Verify ownership
    const note = await prisma.note.findFirst({
      where: { id: noteId, userId },
    });

    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found or access denied' });
    }

    const finalContent = (content !== undefined ? content : note.content) || '';

    if (!finalContent || finalContent.trim() === '') {
      return res.status(400).json({ success: false, error: 'Note content is empty' });
    }

    // Sync DB if content was provided
    if (content !== undefined && content !== note.content) {
      await prisma.note.update({
        where: { id: noteId },
        data: { content },
      });
    }

    const prompt = `
Return ONLY valid JSON in this format:

{
  "summary": "...",
  "action_items": ["..."],
  "suggested_title": "..."
}

Note content:
${finalContent}
`;

    // Call OpenRouter
    const response = await openai.chat.completions.create({
      model: "openai/gpt-oss-20b:free",
      messages: [
        { role: "system", content: "You are a helpful assistant that summarizes notes concisely. You always output valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
    });

    const resultText = response.choices[0]?.message?.content || "";
    
    // Safe JSON parsing with robust cleaning
    let parsedResult;
    try {
      // Find JSON block or extract from text
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : resultText;
      parsedResult = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", resultText);
      return res.status(500).json({ success: false, error: "AI returned invalid response format. Please try again." });
    }

    const { summary, action_items = [], suggested_title = "" } = parsedResult;

    if (!summary) {
      return res.status(500).json({ success: false, error: "AI failed to generate a summary" });
    }

    // Check if AIGeneration already exists for this note
    const existingGeneration = await prisma.aIGeneration.findFirst({
      where: { noteId, type: "summary" },
    });

    // Save or update AIGeneration table
    if (existingGeneration) {
      await prisma.aIGeneration.update({
        where: { id: existingGeneration.id },
        data: {
          prompt,
          result: JSON.stringify(parsedResult),
        },
      });
    } else {
      await prisma.aIGeneration.create({
        data: {
          userId,
          noteId,
          type: "summary",
          prompt,
          result: JSON.stringify(parsedResult),
        },
      });
    }

    res.json({
      success: true,
      data: {
        summary,
        action_items,
        suggested_title
      }
    });
  } catch (error: any) {
    console.error("AI Summarization failed:", error);
    
    // Handle specific OpenRouter/OpenAI errors
    if (error.status === 404) {
      return res.status(500).json({ success: false, error: "AI model not available. Please try again later." });
    }
    if (error.status === 401) {
      return res.status(500).json({ success: false, error: "AI configuration error (Invalid API Key)." });
    }
    if (error.status === 429) {
      return res.status(429).json({ success: false, error: "AI rate limit reached. Please wait a moment." });
    }

    const message = error.message || 'Internal server error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /ai/history - Get all AI generations for the logged-in user
router.get('/summary/:noteId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { noteId } = req.params
    const generation = await prisma.aIGeneration.findFirst({
     where: { noteId: noteId as string },
      orderBy: { createdAt: 'desc' }
    })
    if (!generation) return res.json({ success: true, data: null })
    const result = JSON.parse(generation.result)
    res.json({ success: true, data: result })
  } catch {
    res.json({ success: true, data: null })
  }
})
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Get all AIGenerations for this user, joined with note title
    const aiHistory = await prisma.aIGeneration.findMany({
      where: { userId },
      include: {
        note: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Parse and format the results
    const formattedHistory = aiHistory.map((item) => {
      const result = JSON.parse(item.result);
      return {
        id: item.id,
        noteId: item.noteId,
        noteTitle: item.note.title || 'Untitled Draft',
        summary: result.summary || '',
        action_items: result.action_items || [],
        suggested_title: result.suggested_title || '',
        createdAt: item.createdAt,
      };
    });

    res.json({ success: true, data: formattedHistory });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
