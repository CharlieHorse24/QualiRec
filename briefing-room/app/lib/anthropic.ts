import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = "claude-sonnet-4-20250514";

export const MCP_SERVERS: Record<string, { url: string }> = {
  "google-calendar": {
    url: process.env.GOOGLE_CALENDAR_MCP_URL || "http://localhost:3001",
  },
  "gmail-mcp": {
    url: process.env.GMAIL_MCP_URL || "http://localhost:3002",
  },
  hubspot: {
    url: process.env.HUBSPOT_MCP_URL || "http://localhost:3003",
  },
};

export function extractTextFromResponse(response: Anthropic.Message): string {
  const textParts: string[] = [];

  for (const block of response.content) {
    if (block.type === "text") {
      textParts.push(block.text);
    }
  }

  return textParts.join("\n\n");
}

export function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/gm, "")
    .replace(/\n?```\s*$/gm, "")
    .trim();
}

export default anthropic;
