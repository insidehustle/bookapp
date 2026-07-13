import { GoogleGenAI } from "@google/genai";

// NOTE: this directory is still named "claude" to avoid a large import-path
// refactor across every API route, but it currently calls Google's Gemini
// API, not Anthropic's - see the "full swap for now" decision. Swapping back
// to Claude later means reverting the internals of this directory only.

const globalForGemini = globalThis as unknown as {
  gemini: GoogleGenAI | undefined;
};

export const gemini =
  globalForGemini.gemini ?? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

if (process.env.NODE_ENV !== "production") {
  globalForGemini.gemini = gemini;
}
