import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, generateToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export function createAuthRoutes(): Router {
  const router = Router();
  const prisma = new PrismaClient();

  router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError(400, 'Email and password required');

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new AppError(401, 'Invalid credentials');

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new AppError(401, 'Invalid credentials');

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id, email: user.email, name: user.name, role: user.role,
          preferences: JSON.parse(user.preferences || '{}'),
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      },
    });
  });

  router.get('/me', authenticate, async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new AppError(404, 'User not found');
    res.json({
      success: true,
      data: {
        id: user.id, email: user.email, name: user.name, role: user.role,
        preferences: JSON.parse(user.preferences || '{}'),
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  });

  router.put('/me/preferences', authenticate, async (req: Request, res: Response) => {
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { preferences: JSON.stringify(req.body.preferences || {}) },
    });
    res.json({
      success: true,
      data: {
        id: user.id, email: user.email, name: user.name, role: user.role,
        preferences: JSON.parse(user.preferences || '{}'),
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  });

  return router;
}
