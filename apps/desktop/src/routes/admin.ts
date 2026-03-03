import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export function createAdminRoutes(): Router {
  const router = Router();
  const prisma = new PrismaClient();

  router.get('/users', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true, isActive: true,
        createdAt: true, updatedAt: true, _count: { select: { callSessions: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: users });
  });

  router.post('/users', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
    const { email, name, password, role } = req.body;
    if (!email || !name || !password) throw new AppError(400, 'email, name, password required');

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError(409, 'Email already in use');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, passwordHash, role: role || 'RECRUITER' },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
    res.status(201).json({ success: true, data: user });
  });

  router.put('/users/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
    const { name, role, isActive } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;

    const user = await prisma.user.update({
      where: { id: req.params.id }, data,
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
    res.json({ success: true, data: user });
  });

  router.get('/sessions', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
    const { page = '1', pageSize = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [sessions, total] = await Promise.all([
      prisma.callSession.findMany({
        include: {
          recruiter: { select: { id: true, name: true, email: true } },
          template: { select: { id: true, name: true, type: true } },
        },
        orderBy: { startedAt: 'desc' }, skip, take,
      }),
      prisma.callSession.count(),
    ]);

    res.json({
      success: true,
      data: { items: sessions, total, page: parseInt(page as string), pageSize: take, totalPages: Math.ceil(total / take) },
    });
  });

  return router;
}
