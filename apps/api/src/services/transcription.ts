import Anthropic from '@anthropic-ai/sdk';
import type { TemplateSection } from '@qualirec/shared';

interface TranscriptChunk {
  text: string;
  timestamp: string;
  speaker?: string;
  isFinal?: boolean;
}

interface ExtractedAnswer {
  questionId: string;
  responseValue: unknown;
  notes?: string;
  confidence: 'high' | 'medium' | 'low';
}

interface TranscriptAnalysisResult {
  extractedAnswers: ExtractedAnswer[];
  contactInfo: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
  };
  keyTopics: string[];
}

/**
 * Analyze a call transcript using Claude to extract answers to template questions.
 * This powers the "auto-fill from transcript" feature.
 */
export async function analyzeTranscript(
  transcript: TranscriptChunk[],
  sections: TemplateSection[],
  contactType: string,
): Promise<TranscriptAnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return { extractedAnswers: [], contactInfo: {}, keyTopics: [] };
  }

  const fullText = transcript.map((c) => {
    const speaker = c.speaker ? `[${c.speaker}]: ` : '';
    return `${speaker}${c.text}`;
  }).join('\n');

  // Build question list for extraction
  const questionsList: Array<{ id: string; text: string; type: string; options?: string[] }> = [];
  for (const section of sections) {
    for (const q of section.questions) {
      questionsList.push({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
      });
    }
  }

  const prompt = `You are analyzing a recruiter qualification call transcript. This was a ${contactType} qualification call.

Here is the full call transcript:
---
${fullText}
---

Here are the qualification questions that need to be answered from this transcript:
${JSON.stringify(questionsList, null, 2)}

Please analyze the transcript and extract answers for each question. For each question:
- Look for when the topic was discussed in the conversation
- Extract the most accurate answer based on what was said
- For multiple choice questions (type: "select", "multiselect"), match to the closest option
- For yes/no questions (type: "boolean"), return true or false
- For text questions, extract the relevant information
- For rating/scale questions (type: "rating"), extract a number
- Indicate confidence: "high" if explicitly stated, "medium" if inferred, "low" if uncertain

Also extract any contact information mentioned (name, email, phone, company, title).

Respond ONLY with valid JSON in this format:
{
  "extractedAnswers": [
    { "questionId": "...", "responseValue": "...", "notes": "optional context from the conversation", "confidence": "high" }
  ],
  "contactInfo": {
    "name": "...",
    "email": "...",
    "phone": "...",
    "company": "...",
    "title": "..."
  },
  "keyTopics": ["topic1", "topic2"]
}

Only include answers where you found relevant information in the transcript. Skip questions that weren't discussed.`;

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        extractedAnswers: parsed.extractedAnswers || [],
        contactInfo: parsed.contactInfo || {},
        keyTopics: parsed.keyTopics || [],
      };
    }

    return { extractedAnswers: [], contactInfo: {}, keyTopics: [] };
  } catch (error) {
    console.error('Transcript analysis failed:', error);
    return { extractedAnswers: [], contactInfo: {}, keyTopics: [] };
  }
}
