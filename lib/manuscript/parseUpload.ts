import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export type ParsedUpload = {
  text: string;
  filename: string;
};

const ALLOWED_EXTENSIONS = ["txt", "md", "docx", "pdf"] as const;
type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

// Matches the old Express scaffold's multer limit.
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export class UnsupportedFileTypeError extends Error {}
export class FileTooLargeError extends Error {}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx + 1).toLowerCase();
}

function isAllowedExtension(extension: string): extension is AllowedExtension {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(extension);
}

export async function parseUpload(file: File): Promise<ParsedUpload> {
  const extension = getExtension(file.name);

  if (!isAllowedExtension(extension)) {
    throw new UnsupportedFileTypeError(
      `Unsupported file type ".${extension || "unknown"}". Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}.`,
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new FileTooLargeError(
      `File is too large (${Math.round(file.size / 1024 / 1024)}MB). Max is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text: string;

  switch (extension) {
    case "txt":
    case "md":
      text = buffer.toString("utf-8");
      break;
    case "docx": {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
      break;
    }
    case "pdf": {
      const result = await pdfParse(buffer);
      text = result.text;
      break;
    }
  }

  return { text: text.trim(), filename: file.name };
}
