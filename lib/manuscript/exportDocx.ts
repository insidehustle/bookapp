import MarkdownIt from "markdown-it";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

const md = new MarkdownIt();

type Token = {
  type: string;
  tag: string;
  content: string;
  children: Token[] | null;
};

const NUMBERED_LIST_REFERENCE = "manuscript-numbered-list";

const HEADING_BY_LEVEL = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
} as const;

function inlineTokensToRuns(children: Token[] | null): TextRun[] {
  const runs: TextRun[] = [];
  let bold = false;
  let italics = false;
  for (const token of children ?? []) {
    if (token.type === "strong_open") bold = true;
    else if (token.type === "strong_close") bold = false;
    else if (token.type === "em_open") italics = true;
    else if (token.type === "em_close") italics = false;
    else if (token.type === "softbreak" || token.type === "hardbreak") {
      runs.push(new TextRun({ text: "", break: 1 }));
    } else if (token.content) {
      runs.push(new TextRun({ text: token.content, bold, italics }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun("")];
}

/** Converts one chapter's markdown body into docx paragraphs (headings, bold/italic, lists). */
function markdownToParagraphs(markdown: string): Paragraph[] {
  const tokens = md.parse(markdown, {});
  const paragraphs: Paragraph[] = [];
  const listStack: Array<"bullet" | "ordered"> = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "heading_open") {
      const level = Number(token.tag.slice(1)) as 1 | 2 | 3;
      const inline = tokens[++i];
      paragraphs.push(
        new Paragraph({
          heading: HEADING_BY_LEVEL[level] ?? HeadingLevel.HEADING_3,
          children: inlineTokensToRuns(inline.children),
        }),
      );
    } else if (token.type === "paragraph_open") {
      const inline = tokens[++i];
      const listType = listStack[listStack.length - 1];
      paragraphs.push(
        new Paragraph({
          children: inlineTokensToRuns(inline.children),
          ...(listType === "bullet"
            ? { bullet: { level: listStack.length - 1 } }
            : listType === "ordered"
              ? { numbering: { reference: NUMBERED_LIST_REFERENCE, level: listStack.length - 1 } }
              : {}),
        }),
      );
    } else if (token.type === "bullet_list_open") {
      listStack.push("bullet");
    } else if (token.type === "bullet_list_close") {
      listStack.pop();
    } else if (token.type === "ordered_list_open") {
      listStack.push("ordered");
    } else if (token.type === "ordered_list_close") {
      listStack.pop();
    }
  }
  return paragraphs;
}

export async function buildManuscriptDocx(params: {
  projectTitle: string;
  chapters: { order: number; title: string; content: string }[];
}): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ text: params.projectTitle, heading: HeadingLevel.TITLE }),
  ];

  params.chapters.forEach((chapter, index) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: index > 0,
        children: [new TextRun(`Chapter ${chapter.order}: ${chapter.title}`)],
      }),
    );
    children.push(...markdownToParagraphs(chapter.content));
  });

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: NUMBERED_LIST_REFERENCE,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}
