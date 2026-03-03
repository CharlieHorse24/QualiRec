import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export function createSummaryRoutes(): Router {
  const router = Router();
  const prisma = new PrismaClient();

  router.post('/:sessionId/generate', authenticate, async (req: Request, res: Response) => {
    const session = await prisma.callSession.findUnique({
      where: { id: req.params.sessionId },
      include: { template: true, answers: true },
    });
    if (!session) throw new AppError(404, 'Session not found');

    const sections = JSON.parse(session.templateSnapshot || session.template.sections || '[]');
    const answers = session.answers.map((a) => ({
      questionId: a.questionId,
      responseValue: a.responseValue ? JSON.parse(a.responseValue) : null,
      notes: a.notes, status: a.status,
    }));

    let summary = { narrative: '', highlights: [] as string[], nextActions: [] as string[], generatedAt: new Date().toISOString(), wasEdited: false };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic.default({ apiKey });

        const questionsText = sections.flatMap((s: Record<string, unknown>) =>
          ((s.questions as Array<Record<string, unknown>>) || []).map((q) => {
            const answer = answers.find((a) => a.questionId === q.id);
            return answer && answer.status !== 'SKIPPED'
              ? `Q: ${q.text}\nA: ${JSON.stringify(answer.responseValue)}`
              : null;
          }).filter(Boolean)
        ).join('\n\n');

        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [{ role: 'user', content: `Summarize this recruiter qualification call:\n\n${questionsText}\n\nProvide JSON: {"narrative":"...","highlights":["..."],"nextActions":["..."]}` }],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          summary = { ...summary, ...parsed };
        }
      } catch (err) {
        console.error('AI summary generation failed:', err);
      }
    }

    await prisma.callSession.update({
      where: { id: session.id }, data: { summary: JSON.stringify(summary) },
    });

    res.json({ success: true, data: summary });
  });

  return router;
}
