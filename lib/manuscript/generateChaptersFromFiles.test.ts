import { describe, expect, it } from "vitest";
import { generateChaptersFromFiles } from "./generateChaptersFromFiles";

function makeFile(overrides: { filename: string; extractedText: string; createdAt: Date }) {
  return {
    id: overrides.filename,
    projectId: "proj_1",
    wordCount: overrides.extractedText.split(/\s+/).filter(Boolean).length,
    filename: overrides.filename,
    extractedText: overrides.extractedText,
    createdAt: overrides.createdAt,
  };
}

describe("generateChaptersFromFiles", () => {
  it("splits a single file by its own headings", () => {
    const first = `First. ${"word ".repeat(60).trim()}`;
    const second = `Second. ${"word ".repeat(60).trim()}`;
    const file = makeFile({
      filename: "draft.docx",
      extractedText: `Chapter 1\n${first}\n\nChapter 2\n${second}`,
      createdAt: new Date("2026-01-01"),
    });

    const chapters = generateChaptersFromFiles([file]);
    expect(chapters).toEqual([
      { title: "Chapter 1", content: first },
      { title: "Chapter 2", content: second },
    ]);
  });

  it("treats multiple files as separate chapters in upload order", () => {
    const fileB = makeFile({
      filename: "part-two.txt",
      extractedText: "The second part of the story.",
      createdAt: new Date("2026-01-02"),
    });
    const fileA = makeFile({
      filename: "part-one.txt",
      extractedText: "The first part of the story.",
      createdAt: new Date("2026-01-01"),
    });

    // Passed in reverse order - result should still follow createdAt.
    const chapters = generateChaptersFromFiles([fileB, fileA]);
    expect(chapters).toEqual([
      { title: "Imported Draft", content: "The first part of the story." },
      { title: "Imported Draft", content: "The second part of the story." },
    ]);
  });

  it("returns an empty array for no files", () => {
    expect(generateChaptersFromFiles([])).toEqual([]);
  });
});
