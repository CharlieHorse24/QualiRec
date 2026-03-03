import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { isValidEmail } from '@qualirec/shared';

const router = Router();

// List users
router.get('/users', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      preferences: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { callSessions: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: users });
});

// Create user
router.post('/users', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const { email, name, password, role } = req.body;

  if (!email || !isValidEmail(email)) throw new AppError(400, 'Valid email is required');
  if (!name) throw new AppError(400, 'Name is required');
  if (!password || password.length < 6) throw new AppError(400, 'Password must be at least 6 characters');

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new AppError(409, 'Email already in use');

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: role || 'RECRUITER',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.id,
    },
  });

  res.status(201).json({ success: true, data: user });
});

// Update user
router.put('/users/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const { name, role, isActive } = req.body;
  const updateData: Record<string, unknown> = {};

  if (name !== undefined) updateData.name = name;
  if (role !== undefined) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: user.id,
      diff: req.body,
    },
  });

  res.json({ success: true, data: user });
});

// List all sessions (admin view)
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
      orderBy: { startedAt: 'desc' },
      skip,
      take,
    }),
    prisma.callSession.count(),
  ]);

  res.json({
    success: true,
    data: {
      items: sessions,
      total,
      page: parseInt(page as string),
      pageSize: take,
      totalPages: Math.ceil(total / take),
    },
  });
});

// Integration configs
router.get('/integrations', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  const configs = await prisma.integrationConfig.findMany({
    where: { userId: null },
    orderBy: { adapterType: 'asc' },
  });

  res.json({ success: true, data: configs });
});

router.put('/integrations/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const { isActive, credentials } = req.body;
  const updateData: Record<string, unknown> = {};

  if (isActive !== undefined) updateData.isActive = isActive;
  if (credentials !== undefined) updateData.credentials = credentials;

  const config = await prisma.integrationConfig.update({
    where: { id: req.params.id },
    data: updateData,
  });

  res.json({ success: true, data: config });
});

// Audit logs
router.get('/audit-logs', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const { page = '1', pageSize = '50', entityType } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const take = parseInt(pageSize as string);

  const where: Record<string, unknown> = {};
  if (entityType) where.entityType = entityType;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      items: logs,
      total,
      page: parseInt(page as string),
      pageSize: take,
      totalPages: Math.ceil(total / take),
    },
  });
});

export default router;
