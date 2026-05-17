import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma.js';
import { generateToken } from '../utils/jwt.js';
import { authenticateToken } from '../middleware/auth.js';
const router = Router();
// POST /auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: 'Please provide email, password, and name.',
            });
        }
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists.',
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
        });
        const token = generateToken(user.id);
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({
            success: true,
            data: {
                token,
                user: userWithoutPassword,
            },
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error.';
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide email and password.',
            });
        }
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials.',
            });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials.',
            });
        }
        const token = generateToken(user.id);
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            success: true,
            data: {
                token,
                user: userWithoutPassword,
            },
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error.';
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
// GET /auth/me
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized.',
            });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found.',
            });
        }
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            success: true,
            data: userWithoutPassword,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error.';
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
export default router;
//# sourceMappingURL=auth.js.map