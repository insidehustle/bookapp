import { describe, expect, it } from "vitest";
import { splitChapters } from "./splitChapters";

// A body long enough to clear the "too short to be a real chapter" merge
// threshold, so tests that aren't specifically about that behavior don't
// trip over it.
function longBody(label: string): string {
  return `${label} ${"word ".repeat(60).trim()}`;
}

describe("splitChapters", () => {
  it("returns an empty array for blank input", () => {
    expect(splitChapters("   \n\n  ")).toEqual([]);
  });

  it("falls back to a single chapter when no headings are found", () => {
    const text = "Once upon a time, in a land far away...\n\nThe end.";
    expect(splitChapters(text)).toEqual([
      { title: "Imported Draft", content: text },
    ]);
  });

  it("splits on 'Chapter N' headings", () => {
    const text = [
      "Chapter 1",
      longBody("This is the first chapter."),
      "",
      "Chapter 2",
      longBody("This is the second chapter."),
    ].join("\n");

    const chapters = splitChapters(text);
    expect(chapters).toHaveLength(2);
    expect(chapters[0]).toEqual({
      title: "Chapter 1",
      content: longBody("This is the first chapter."),
    });
    expect(chapters[1]).toEqual({
      title: "Chapter 2",
      content: longBody("This is the second chapter."),
    });
  });

  it("splits on markdown headings", () => {
    const text = [
      "# Chapter One: The Beginning",
      longBody("It started here."),
      "## Chapter Two",
      longBody("It continued here."),
    ].join("\n");

    const chapters = splitChapters(text);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe("Chapter One: The Beginning");
    expect(chapters[1].title).toBe("Chapter Two");
  });

  it("skips headings with no body before the next heading", () => {
    const text = ["Chapter 1", "Chapter 2", longBody("Real content here.")].join("\n");

    const chapters = splitChapters(text);
    expect(chapters).toHaveLength(1);
    expect(chapters[0]).toEqual({
      title: "Chapter 2",
      content: longBody("Real content here."),
    });
  });

  it("falls back to a single chapter if every heading match is empty", () => {
    const text = "Chapter 1\nChapter 2\nChapter 3";
    expect(splitChapters(text)).toEqual([
      { title: "Imported Draft", content: text },
    ]);
  });

  it("folds short section dividers (e.g. 'PART ONE') into the following chapter instead of creating near-empty chapters", () => {
    const text = [
      "PART ONE",
      "A new beginning.",
      "",
      "Chapter 1",
      longBody("First chapter content."),
      "",
      "Chapter 2",
      longBody("Second chapter content."),
      "",
      "PART TWO",
      "Onward.",
      "",
      "Chapter 3",
      longBody("Third chapter content."),
    ].join("\n");

    const chapters = splitChapters(text);
    expect(chapters).toHaveLength(3);
    expect(chapters.map((c) => c.title)).toEqual(["Chapter 1", "Chapter 2", "Chapter 3"]);
    // The divider's own text is preserved, just folded into the next chapter
    // rather than standing alone.
    expect(chapters[0].content).toContain("A new beginning.");
    expect(chapters[0].content).toContain("First chapter content.");
    expect(chapters[2].content).toContain("Onward.");
    expect(chapters[2].content).toContain("Third chapter content.");
  });

  it("keeps a short trailing heading as its own chapter (it's still the last real section)", () => {
    const text = [
      "Chapter 1",
      longBody("First chapter content."),
      "",
      "PART TWO",
      "Fin.",
    ].join("\n");

    const chapters = splitChapters(text);
    // The trailing match is short, but there's nothing after it to fold
    // into - it's kept as its own (short) final chapter rather than lost.
    expect(chapters).toHaveLength(2);
    expect(chapters[1]).toEqual({ title: "PART TWO", content: "Fin." });
  });
});
