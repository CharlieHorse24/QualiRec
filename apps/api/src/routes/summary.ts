import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { generateCallSummary } from '../services/summary';
import type { TemplateSection } from '@qualirec/shared';

const router = Router();

// Generate summary for a session
router.post('/:sessionId/generate', authenticate, async (req: Request, res: Response) => {
  const session = await prisma.callSession.findUnique({
    where: { id: req.params.sessionId },
    include: {
      template: true,
      answers: true,
    },
  });

  if (!session) throw new AppError(404, 'Session not found');

  const sections = (session.templateSnapshot || session.template.sections) as unknown as TemplateSection[];

  const summary = await generateCallSummary({
    contactType: session.contactType,
    contactName: session.contactName || undefined,
    templateName: session.template.name,
    sections,
    answers: session.answers.map((a) => ({
      questionId: a.questionId,
      responseValue: a.responseValue,
      notes: a.notes || undefined,
      status: a.status,
    })),
    floatingNotes: session.floatingNotes || undefined,
    duration: session.duration || undefined,
  });

  // Auto-save the generated summary
  await prisma.callSession.update({
    where: { id: session.id },
    data: { summary: summary as unknown as Record<string, unknown> },
  });

  res.json({ success: true, data: summary });
});

export default router;
