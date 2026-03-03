import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export function createSessionRoutes(): Router {
  const router = Router();
  const prisma = new PrismaClient();

  // Dashboard stats — must come before /:id
  router.get('/stats/dashboard', authenticate, async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [callsToday, callsThisWeek, callsThisMonth, avgDuration, flaggedCount] = await Promise.all([
      prisma.callSession.count({ where: { recruiterId: userId, startedAt: { gte: startOfDay } } }),
      prisma.callSession.count({ where: { recruiterId: userId, startedAt: { gte: startOfWeek } } }),
      prisma.callSession.count({ where: { recruiterId: userId, startedAt: { gte: startOfMonth } } }),
      prisma.callSession.aggregate({ where: { recruiterId: userId, duration: { not: null } }, _avg: { duration: true } }),
      prisma.callSession.count({ where: { recruiterId: userId, crmSyncStatus: 'FAILED' } }),
    ]);

    res.json({
      success: true,
      data: {
        callsToday, callsThisWeek, callsThisMonth,
        avgCallDuration: avgDuration._avg.duration || 0,
        crmSyncRate: 0, flaggedItems: flaggedCount,
      },
    });
  });

  // List sessions
  router.get('/', authenticate, async (req: Request, res: Response) => {
    const { status, contactType, page = '1', pageSize = '20', search } = req.query;
    const where: Record<string, unknown> = { recruiterId: req.user!.userId };
    if (status) where.status = status;
    if (contactType) where.contactType = contactType;
    if (search) {
      where.contactName = { contains: search as string };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [sessions, total] = await Promise.all([
      prisma.callSession.findMany({
        where,
        include: { template: { select: { id: true, name: true, type: true } }, _count: { select: { answers: true } } },
        orderBy: { startedAt: 'desc' }, skip, take,
      }),
      prisma.callSession.count({ where }),
    ]);

    const items = sessions.map((s) => ({
      ...s,
      summary: s.summary ? JSON.parse(s.summary) : null,
      templateSnapshot: s.templateSnapshot ? JSON.parse(s.templateSnapshot) : null,
    }));

    res.json({
      success: true,
      data: { items, total, page: parseInt(page as string), pageSize: take, totalPages: Math.ceil(total / take) },
    });
  });

  // Get session detail
  router.get('/:id', authenticate, async (req: Request, res: Response) => {
    const session = await prisma.callSession.findUnique({
      where: { id: req.params.id },
      include: {
        template: true, recruiter: { select: { id: true, name: true, email: true } },
        answers: { orderBy: { answeredAt: 'asc' } }, crmSyncLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!session) throw new AppError(404, 'Session not found');

    const data = {
      ...session,
      template: { ...session.template, sections: JSON.parse(session.template.sections || '[]') },
      templateSnapshot: session.templateSnapshot ? JSON.parse(session.templateSnapshot) : null,
      summary: session.summary ? JSON.parse(session.summary) : null,
      answers: session.answers.map((a) => ({ ...a, responseValue: a.responseValue ? JSON.parse(a.responseValue) : null })),
    };

    res.json({ success: true, data });
  });

  // Create session
  router.post('/', authenticate, async (req: Request, res: Response) => {
    const { templateId, contactType, contactName, contactEmail, contactPhone, crmContactId, voipAdapter } = req.body;
    if (!templateId || !contactType) throw new AppError(400, 'templateId and contactType required');

    const template = await prisma.template.findUnique({ where: { id: templateId } });
    if (!template) throw new AppError(404, 'Template not found');

    const session = await prisma.callSession.create({
      data: {
        recruiterId: req.user!.userId, templateId, templateVersion: template.version,
        templateSnapshot: template.sections, contactType, contactName, contactEmail, contactPhone,
        crmContactId, voipAdapter: voipAdapter || 'manual',
      },
      include: { template: true, answers: true },
    });

    res.status(201).json({
      success: true,
      data: {
        ...session,
        template: { ...session.template, sections: JSON.parse(session.template.sections || '[]') },
        templateSnapshot: session.templateSnapshot ? JSON.parse(session.templateSnapshot as string) : null,
      },
    });
  });

  // Update answer
  router.put('/:id/answers', authenticate, async (req: Request, res: Response) => {
    const { questionId, responseValue, notes, status } = req.body;
    if (!questionId) throw new AppError(400, 'questionId required');

    const answer = await prisma.sessionAnswer.upsert({
      where: { sessionId_questionId: { sessionId: req.params.id, questionId } },
      create: {
        sessionId: req.params.id, questionId,
        responseValue: responseValue !== undefined ? JSON.stringify(responseValue) : null,
        notes: notes || null, status: status || 'ANSWERED',
      },
      update: {
        responseValue: responseValue !== undefined ? JSON.stringify(responseValue) : null,
        notes: notes || null, status: status || 'ANSWERED', answeredAt: new Date(),
      },
    });
    res.json({ success: true, data: answer });
  });

  // Update floating notes
  router.put('/:id/notes', authenticate, async (req: Request, res: Response) => {
    const updated = await prisma.callSession.update({
      where: { id: req.params.id }, data: { floatingNotes: req.body.floatingNotes },
    });
    res.json({ success: true, data: updated });
  });

  // End session
  router.post('/:id/end', authenticate, async (req: Request, res: Response) => {
    const session = await prisma.callSession.findUnique({ where: { id: req.params.id } });
    if (!session) throw new AppError(404, 'Session not found');
    if (session.status !== 'IN_PROGRESS') throw new AppError(400, 'Session is not in progress');

    const endedAt = new Date();
    const duration = Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000);

    const updated = await prisma.callSession.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED', endedAt, duration, floatingNotes: req.body.floatingNotes ?? session.floatingNotes },
      include: { template: true, answers: true },
    });

    res.json({
      success: true,
      data: {
        ...updated,
        template: { ...updated.template, sections: JSON.parse(updated.template.sections || '[]') },
        answers: updated.answers.map((a) => ({ ...a, responseValue: a.responseValue ? JSON.parse(a.responseValue) : null })),
      },
    });
  });

  // Save summary
  router.put('/:id/summary', authenticate, async (req: Request, res: Response) => {
    const { summary } = req.body;
    if (!summary) throw new AppError(400, 'Summary required');
    const session = await prisma.callSession.findUnique({ where: { id: req.params.id } });
    if (!session) throw new AppError(404, 'Session not found');

    const updated = await prisma.callSession.update({
      where: { id: req.params.id },
      data: { summary: JSON.stringify(summary), status: session.status === 'COMPLETED' ? 'PENDING_SYNC' : session.status },
    });
    res.json({ success: true, data: updated });
  });

  // Update session contact
  router.put('/:id/contact', authenticate, async (req: Request, res: Response) => {
    const { contactName, contactEmail, contactPhone, crmContactId } = req.body;
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

  return router;
}
