import { NextRequest, NextResponse } from "next/server";
import anthropic, { MODEL, extractTextFromResponse } from "../../lib/anthropic";

const SYSTEM_PROMPT = `You are an elite executive briefing assistant for a UK&I Country Manager. Your job is to produce a sharp, intelligence-style pre-meeting brief on a stakeholder.

Search Gmail for recent email threads with this person or their company. Check HubSpot CRM for contact history, deal stages, and company records. Search the web for recent LinkedIn activity, company news, and market developments from the last 30 days.

Produce a structured brief in markdown with exactly these sections:

## WHO THEY ARE
Role, company, background

## RELATIONSHIP HISTORY
Last contact, email tone, key interactions from Gmail

## BUSINESS CONTEXT
HubSpot deal stage, pipeline value, open opportunities

## RECENT INTEL
Company news, web presence, market movements (last 30 days)

## TALKING POINTS
3 specific, sharp things to raise

## WATCH OUTS
Risks, sensitivities, things to avoid

Be concise, direct, and executive-ready. Every point must be specific and actionable. No filler. If you cannot find information from a specific source, note what was checked and that no results were found — do not fabricate data.`;

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid query parameter" },
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
          content: `Prepare a comprehensive pre-meeting intelligence brief on: ${query}

Use all available tools — search email, CRM, and the web — to compile the most complete picture possible. If a tool is unavailable, still produce the brief from whatever sources you can access.`,
        },
      ],
    });

    const content = extractTextFromResponse(response);

    if (!content) {
      return NextResponse.json(
        { error: "No content generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Brief API error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate brief",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
