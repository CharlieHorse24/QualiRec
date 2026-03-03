import { NextRequest, NextResponse } from "next/server";
import anthropic, {
  MODEL,
  extractTextFromResponse,
  stripMarkdownFences,
} from "../../lib/anthropic";

const SYSTEM_PROMPT = `You are a B2B sales qualification expert specialising in enterprise UK deals. You will receive a stakeholder brief and must produce a MEDDIC qualification sheet.

Return ONLY a valid JSON object (no markdown, no preamble, no explanation) with this exact structure:

{
  "overall_score": <number 0-100>,
  "score_rationale": "<one sentence>",
  "company_overview": "<2-3 sentences>",
  "economic_buyer": "<name, title, and why they control budget>",
  "decision_maker": "<name, title, influence level>",
  "metrics": "<measurable outcomes they care about>",
  "economic_justification": "<budget signals and spend capacity>",
  "decision_criteria": "<what they evaluate vendors on>",
  "decision_process": "<steps, stakeholders, timeline>",
  "identify_pain": "<core problems and urgency>",
  "champion": "<who would advocate internally>",
  "competition": "<alternatives they may consider>",
  "timeline": "<when they need to decide or implement>",
  "next_steps": ["<step 1>", "<step 2>", "<step 3>"]
}

Every field must be populated. If information is limited, make reasonable inferences based on the brief and note assumptions. The overall_score should reflect data completeness and deal readiness.`;

export async function POST(request: NextRequest) {
  try {
    const { briefContent, stakeholderName } = await request.json();

    if (!briefContent || typeof briefContent !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid briefContent parameter" },
        { status: 400 }
      );
    }

    if (!stakeholderName || typeof stakeholderName !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid stakeholderName parameter" },
        { status: 400 }
      );
    }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the stakeholder brief:\n\n${briefContent}\n\nGenerate the MEDDIC qualification sheet for: ${stakeholderName}`,
        },
      ],
    });

    const text = extractTextFromResponse(response);
    const cleaned = stripMarkdownFences(text);

    let qualification;
    try {
      qualification = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          error: "Failed to parse qualification response as JSON",
          details: cleaned.substring(0, 200),
        },
        { status: 500 }
      );
    }

    // Ensure next_steps is an array
    if (!Array.isArray(qualification.next_steps)) {
      qualification.next_steps = [
        "Review available data and schedule discovery call",
        "Identify internal champion and schedule intro",
        "Prepare tailored value proposition",
      ];
    }

    // Ensure overall_score is a number
    if (typeof qualification.overall_score !== "number") {
      qualification.overall_score = 50;
    }

    return NextResponse.json({ qualification });
  } catch (error) {
    console.error("Qualify API error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate qualification sheet",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
