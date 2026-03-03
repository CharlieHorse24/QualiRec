import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { validateCreateSession } from '@qualirec/shared';

const router = Router();

// List sessions
router.get('/', authenticate, async (req: Request, res: Response) => {
  const { status, contactType, page = '1', pageSize = '20', search, fromDate, toDate } = req.query;

  const where: Record<string, unknown> = { recruiterId: req.user!.userId };
  if (status) where.status = status;
  if (contactType) where.contactType = contactType;
  if (search) {
    where.OR = [
      { contactName: { contains: search as string, mode: 'insensitive' } },
      { contactEmail: { contains: search as string, mode: 'insensitive' } },
    ];
  }
  if (fromDate || toDate) {
    where.startedAt = {};
    if (fromDate) (where.startedAt as Record<string, unknown>).gte = new Date(fromDate as string);
    if (toDate) (where.startedAt as Record<string, unknown>).lte = new Date(toDate as string);
  }

  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const take = parseInt(pageSize as string);

  const [sessions, total] = await Promise.all([
    prisma.callSession.findMany({
      where,
      include: {
        template: { select: { id: true, name: true, type: true } },
        _count: { select: { answers: true } },
      },
      orderBy: { startedAt: 'desc' },
      skip,
      take,
    }),
    prisma.callSession.count({ where }),
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

// Get session detail
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const session = await prisma.callSession.findUnique({
    where: { id: req.params.id },
    include: {
      template: true,
      recruiter: { select: { id: true, name: true, email: true } },
      answers: { orderBy: { answeredAt: 'asc' } },
      crmSyncLogs: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!session) throw new AppError(404, 'Session not found');
  res.json({ success: true, data: session });
});

// Create session
router.post('/', authenticate, async (req: Request, res: Response) => {
  const validation = validateCreateSession(req.body);
  if (!validation.valid) {
    throw new AppError(400, validation.errors.join('; '));
  }

  const { templateId, contactType, contactName, contactEmail, contactPhone, crmContactId, voipAdapter, voipCallId } = req.body;

  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) throw new AppError(404, 'Template not found');

  const session = await prisma.callSession.create({
    data: {
      recruiterId: req.user!.userId,
      templateId,
      templateVersion: template.version,
      templateSnapshot: template.sections as object,
      contactType,
      contactName,
      contactEmail,
      contactPhone,
      crmContactId,
      voipAdapter: voipAdapter || 'manual',
      voipCallId,
    },
    include: {
      template: true,
      answers: true,
    },
  });

  res.status(201).json({ success: true, data: session });
});

// Update answer
router.put('/:id/answers', authenticate, async (req: Request, res: Response) => {
  const { questionId, responseValue, notes, status } = req.body;

  if (!questionId) throw new AppError(400, 'questionId is required');

  const session = await prisma.callSession.findUnique({ where: { id: req.params.id } });
  if (!session) throw new AppError(404, 'Session not found');
  if (session.recruiterId !== req.user!.userId) throw new AppError(403, 'Not your session');

  const answer = await prisma.sessionAnswer.upsert({
    where: {
      sessionId_questionId: {
        sessionId: req.params.id,
        questionId,
      },
    },
    create: {
      sessionId: req.params.id,
      questionId,
      responseValue: responseValue ?? null,
      notes: notes || null,
      status: status || 'ANSWERED',
    },
    update: {
      responseValue: responseValue ?? null,
      notes: notes || null,
      status: status || 'ANSWERED',
      answeredAt: new Date(),
    },
  });

  res.json({ success: true, data: answer });
});

// Update floating notes
router.put('/:id/notes', authenticate, async (req: Request, res: Response) => {
  const { floatingNotes } = req.body;

  const session = await prisma.callSession.findUnique({ where: { id: req.params.id } });
  if (!session) throw new AppError(404, 'Session not found');
  if (session.recruiterId !== req.user!.userId) throw new AppError(403, 'Not your session');

  const updated = await prisma.callSession.update({
    where: { id: req.params.id },
    data: { floatingNotes },
  });

  res.json({ success: true, data: updated });
});

// End session
router.post('/:id/end', authenticate, async (req: Request, res: Response) => {
  const session = await prisma.callSession.findUnique({ where: { id: req.params.id } });
  if (!session) throw new AppError(404, 'Session not found');
  if (session.recruiterId !== req.user!.userId) throw new AppError(403, 'Not your session');
  if (session.status !== 'IN_PROGRESS') throw new AppError(400, 'Session is not in progress');

  const endedAt = new Date();
  const duration = Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000);

  const updated = await prisma.callSession.update({
    where: { id: req.params.id },
    data: {
      status: 'COMPLETED',
      endedAt,
      duration,
      floatingNotes: req.body.floatingNotes ?? session.floatingNotes,
    },
    include: {
      template: true,
      answers: true,
    },
  });

  res.json({ success: true, data: updated });
});

// Save summary
router.put('/:id/summary', authenticate, async (req: Request, res: Response) => {
  const { summary } = req.body;
  if (!summary) throw new AppError(400, 'Summary is required');

  const session = await prisma.callSession.findUnique({ where: { id: req.params.id } });
  if (!session) throw new AppError(404, 'Session not found');

  const updated = await prisma.callSession.update({
    where: { id: req.params.id },
    data: {
      summary,
      status: session.status === 'COMPLETED' ? 'PENDING_SYNC' : session.status,
    },
  });

  res.json({ success: true, data: updated });
});

// Update session contact info
router.put('/:id/contact', authenticate, async (req: Request, res: Response) => {
  const { contactName, contactEmail, contactPhone, crmContactId } = req.body;

  const session = await prisma.callSession.findUnique({ where: { id: req.params.id } });
  if (!session) throw new AppError(404, 'Session not found');

  const updated = await prisma.callSession.update({
    where: { id: req.params.id },
    data: {
      ...(contactName !== undefined && { contactName }),
      ...(contactEmail !== undefined && { contactEmail }),
      ...(contactPhone !== undefined && { contactPhone }),
      ...(crmContactId !== undefined && { crmContactId }),
    },
  });

  res.json({ success: true, data: updated });
});

// Dashboard stats
router.get('/stats/dashboard', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [callsToday, callsThisWeek, callsThisMonth, avgDuration, syncStats, flaggedCount] = await Promise.all([
    prisma.callSession.count({
      where: { recruiterId: userId, startedAt: { gte: startOfDay } },
    }),
    prisma.callSession.count({
      where: { recruiterId: userId, startedAt: { gte: startOfWeek } },
    }),
    prisma.callSession.count({
      where: { recruiterId: userId, startedAt: { gte: startOfMonth } },
    }),
    prisma.callSession.aggregate({
      where: { recruiterId: userId, duration: { not: null } },
      _avg: { duration: true },
    }),
    prisma.callSession.groupBy({
      by: ['crmSyncStatus'],
      where: { recruiterId: userId, startedAt: { gte: startOfMonth } },
      _count: true,
    }),
    prisma.callSession.count({
      where: {
        recruiterId: userId,
        OR: [
          { crmSyncStatus: 'FAILED' },
          { status: 'SYNC_FAILED' },
        ],
      },
    }),
  ]);

  const totalSynced = syncStats.reduce((acc, s) => acc + s._count, 0);
  const completedSyncs = syncStats.find(s => s.crmSyncStatus === 'COMPLETED')?._count || 0;
  const syncRate = totalSynced > 0 ? (completedSyncs / totalSynced) * 100 : 0;

  res.json({
    success: true,
    data: {
      callsToday,
      callsThisWeek,
      callsThisMonth,
      avgCallDuration: avgDuration._avg.duration || 0,
      crmSyncRate: Math.round(syncRate),
      flaggedItems: flaggedCount,
    },
  });
});

export default router;
