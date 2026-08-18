import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { MissingApiKeyError } from "@/lib/claude/errors";

// NOTE: this directory is still named "claude" to avoid a large import-path
// refactor across every API route, but it currently calls Google's Gemini
// API, not Anthropic's - see the "full swap for now" decision. Swapping back
// to Claude later means reverting the internals of this directory only.

/**
 * Every AI call is made with the requesting user's own Gemini API key -
 * there is no shared/fallback server key, so this throws MissingApiKeyError
 * if they haven't saved one yet (see /account).
 */
export async function getUserGeminiClient(userId: string): Promise<GoogleGenAI> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { geminiApiKey: true },
  });
  if (!user?.geminiApiKey) {
    throw new MissingApiKeyError();
  }
  return new GoogleGenAI({ apiKey: decrypt(user.geminiApiKey) });
}
