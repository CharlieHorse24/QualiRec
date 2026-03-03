import Anthropic from '@anthropic-ai/sdk';
import type { CallSessionSummary, TemplateSection, SessionAnswer } from '@qualirec/shared';
import { MAX_SUMMARY_TIMEOUT_MS } from '@qualirec/shared';

interface SummaryInput {
  contactType: string;
  contactName?: string;
  templateName: string;
  sections: TemplateSection[];
  answers: Array<{
    questionId: string;
    responseValue: unknown;
    notes?: string;
    status: string;
  }>;
  floatingNotes?: string;
  duration?: number;
}

export async function generateCallSummary(input: SummaryInput): Promise<CallSessionSummary> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return createManualFallback();
  }

  const questionsText = buildQuestionsText(input);

  const prompt = `You are summarizing a recruiter qualification call. The call was a ${input.contactType} qualification using the "${input.templateName}" template.
${input.contactName ? `Contact: ${input.contactName}` : ''}
${input.duration ? `Duration: ${Math.round(input.duration / 60)} minutes` : ''}

Here are the questions and answers from the call:

${questionsText}

${input.floatingNotes ? `Additional Notes:\n${input.floatingNotes}` : ''}

Please provide:
1. A concise narrative summary (3-5 sentences) of the key outcomes
2. Key highlights as bullet points (3-7 items)
3. Suggested next actions (2-4 items)

Format your response as JSON:
{
  "narrative": "...",
  "highlights": ["...", "..."],
  "nextActions": ["...", "..."]
}`;

  try {
    const client = new Anthropic({ apiKey });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MAX_SUMMARY_TIMEOUT_MS);

    const response = await client.messages.create(
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: controller.signal },
    );

    clearTimeout(timeout);

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        narrative: parsed.narrative || '',
        highlights: parsed.highlights || [],
        nextActions: parsed.nextActions || [],
        generatedAt: new Date().toISOString(),
        wasEdited: false,
      };
    }

    return createManualFallback();
  } catch (error) {
    console.error('Summary generation failed:', error);
    return createManualFallback();
  }
}

function buildQuestionsText(input: SummaryInput): string {
  const lines: string[] = [];

  for (const section of input.sections) {
    lines.push(`\n## ${section.title}`);
    for (const question of section.questions) {
      const answer = input.answers.find((a) => a.questionId === question.id);
      if (answer && answer.status !== 'SKIPPED') {
        const value = typeof answer.responseValue === 'object'
          ? JSON.stringify(answer.responseValue)
          : String(answer.responseValue ?? 'N/A');
        lines.push(`Q: ${question.text}`);
        lines.push(`A: ${value}`);
        if (answer.notes) lines.push(`Notes: ${answer.notes}`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

function createManualFallback(): CallSessionSummary {
  return {
    narrative: '',
    highlights: [],
    nextActions: [],
    generatedAt: new Date().toISOString(),
    wasEdited: false,
  };
}
