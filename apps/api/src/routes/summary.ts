import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { generateCallSummary } from '../services/summary';
import { analyzeTranscript } from '../services/transcription';
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

// Analyze transcript and extract answers
router.post('/:sessionId/analyze-transcript', authenticate, async (req: Request, res: Response) => {
  const session = await prisma.callSession.findUnique({
    where: { id: req.params.sessionId },
    include: {
      template: true,
      answers: true,
    },
  });

  if (!session) throw new AppError(404, 'Session not found');

  const transcript = (session as Record<string, unknown>).transcript as Array<{ text: string; timestamp: string; speaker?: string }>;
  if (!transcript || transcript.length === 0) {
    throw new AppError(400, 'No transcript available for analysis');
  }

  const sections = (session.templateSnapshot || session.template.sections) as unknown as TemplateSection[];

  const result = await analyzeTranscript(transcript, sections, session.contactType);

  // Auto-apply extracted answers to the session
  if (result.extractedAnswers.length > 0) {
    for (const extracted of result.extractedAnswers) {
      // Only apply if the question hasn't been answered yet, or if confidence is high
      const existing = session.answers.find((a) => a.questionId === extracted.questionId);
      if (!existing || (extracted.confidence === 'high' && !existing.responseValue)) {
        await prisma.sessionAnswer.upsert({
          where: {
            sessionId_questionId: {
              sessionId: session.id,
              questionId: extracted.questionId,
            },
          },
          create: {
            sessionId: session.id,
            questionId: extracted.questionId,
            responseValue: extracted.responseValue as unknown as string ?? null,
            notes: extracted.notes ? `[AI-extracted, ${extracted.confidence}] ${extracted.notes}` : `[AI-extracted, ${extracted.confidence}]`,
            status: 'ANSWERED',
          },
          update: {
            responseValue: extracted.responseValue as unknown as string ?? null,
            notes: extracted.notes ? `[AI-extracted, ${extracted.confidence}] ${extracted.notes}` : `[AI-extracted, ${extracted.confidence}]`,
            answeredAt: new Date(),
          },
        });
      }
    }
  }

  // Auto-update contact info if extracted
  const ci = result.contactInfo;
  if (ci.name || ci.email || ci.phone || ci.company) {
    await prisma.callSession.update({
      where: { id: session.id },
      data: {
        ...(ci.name && !session.contactName && { contactName: ci.name }),
        ...(ci.email && !session.contactEmail && { contactEmail: ci.email }),
        ...(ci.phone && !session.contactPhone && { contactPhone: ci.phone }),
      },
    });
  }

  res.json({ success: true, data: result });
});

export default router;
