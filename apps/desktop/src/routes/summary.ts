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

  // Analyze transcript and extract answers
  router.post('/:sessionId/analyze-transcript', authenticate, async (req: Request, res: Response) => {
    const session = await prisma.callSession.findUnique({
      where: { id: req.params.sessionId },
      include: { template: true, answers: true },
    });
    if (!session) throw new AppError(404, 'Session not found');

    const chunks: Array<{ text: string; timestamp: string; speaker?: string }> = session.transcript ? JSON.parse(session.transcript) : [];
    if (chunks.length === 0) throw new AppError(400, 'No transcript available');

    const fullText = chunks.map((c) => c.text).join(' ');
    const sections = JSON.parse(session.templateSnapshot || session.template.sections || '[]');

    const allQuestions: Array<{ id: string; text: string; responseType: string; options?: string[] }> = [];
    for (const section of sections as Array<Record<string, unknown>>) {
      for (const q of (section.questions as Array<Record<string, unknown>> || [])) {
        allQuestions.push({ id: q.id as string, text: q.text as string, responseType: q.responseType as string, options: q.options as string[] });
      }
    }

    let result = {
      extractedAnswers: [] as Array<{ questionId: string; responseValue: unknown; notes?: string; confidence: string }>,
      contactInfo: {} as Record<string, string>,
      keyTopics: [] as string[],
    };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic.default({ apiKey });

        const questionsJson = JSON.stringify(allQuestions, null, 2);

        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          messages: [{
            role: 'user',
            content: `Analyze this call transcript and extract answers to the qualification questions.

Transcript:
${fullText}

Questions:
${questionsJson}

Return JSON with this structure:
{
  "extractedAnswers": [{"questionId": "...", "responseValue": "...", "notes": "brief context", "confidence": "HIGH|MEDIUM|LOW"}],
  "contactInfo": {"name": "...", "email": "...", "phone": "...", "company": "...", "title": "..."},
  "keyTopics": ["topic1", "topic2"]
}

Only include answers you can confidently extract from the transcript. For SINGLE_SELECT/MULTI_SELECT questions, match the available options. For YES_NO, use true/false. For NUMERIC, use numbers.`,
          }],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      } catch (err) {
        console.error('Transcript analysis failed:', err);
      }
    }

    // Auto-apply extracted answers with MEDIUM or HIGH confidence
    for (const extracted of (result.extractedAnswers || [])) {
      if (extracted.confidence === 'LOW') continue;
      try {
        await prisma.sessionAnswer.upsert({
          where: { sessionId_questionId: { sessionId: session.id, questionId: extracted.questionId } },
          create: {
            sessionId: session.id,
            questionId: extracted.questionId,
            responseValue: JSON.stringify(extracted.responseValue),
            notes: extracted.notes || null,
            status: 'ANSWERED',
          },
          update: {
            responseValue: JSON.stringify(extracted.responseValue),
            notes: extracted.notes || null,
            status: 'ANSWERED',
            answeredAt: new Date(),
          },
        });
      } catch {
        // skip if upsert fails
      }
    }

    // Auto-update contact info if missing
    const ci = result.contactInfo || {};
    if (ci.name || ci.email || ci.phone) {
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

  return router;
}
