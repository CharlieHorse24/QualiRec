import { NextResponse } from "next/server";
import anthropic, { MODEL, extractTextFromResponse } from "../../lib/anthropic";

export async function POST() {
  try {
    const today = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        "You are a calendar assistant. List today's meetings as a JSON array. Each item must have: { title, time, attendees, meetingId }. Return ONLY valid JSON, no markdown fences, no explanation.",
      messages: [
        {
          role: "user",
          content: `List all my calendar events for today (${today}). Include attendee names and email addresses. Return the data as a JSON array.`,
        },
      ],
    });

    const text = extractTextFromResponse(response);
    let meetings;

    try {
      // Strip any markdown fences
      const cleaned = text
        .replace(/^```(?:json)?\s*\n?/gm, "")
        .replace(/\n?```\s*$/gm, "")
        .trim();
      meetings = JSON.parse(cleaned);
    } catch {
      // If parsing fails, return empty array with note
      meetings = [];
    }

    if (!Array.isArray(meetings)) {
      meetings = [];
    }

    return NextResponse.json({ meetings });
  } catch (error) {
    console.error("Meetings API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch meetings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
