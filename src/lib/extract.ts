import mammoth from "mammoth/mammoth.browser";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { MaterialInput } from "../types";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.slice(dataUrl.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function extractPdfText(data: ArrayBuffer): Promise<string> {
  try {
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" "),
      );
    }
    return pages.join("\n\n").trim();
  } catch {
    // Scanned/encrypted PDFs — the Anthropic provider can still read these
    // natively via the base64 document block.
    return "";
  }
}

export async function extractMaterial(file: File): Promise<MaterialInput> {
  const name = file.name;
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();

  if (ext === "pdf") {
    if (file.size > 30 * 1024 * 1024) {
      throw new Error("PDF is too large (max ~30 MB).");
    }
    // Keep both forms: the base64 goes to Anthropic natively (reads figures
    // too); the extracted text serves OpenAI-compatible providers.
    const [base64, text] = await Promise.all([
      fileToBase64(file),
      file.arrayBuffer().then(extractPdfText),
    ]);
    return { kind: "pdf", name, base64, text };
  }

  if (ext === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    if (!result.value.trim()) {
      throw new Error("Could not extract any text from this .docx file.");
    }
    return { kind: "text", name, text: result.value };
  }

  if (["md", "markdown", "txt", "text"].includes(ext)) {
    return { kind: "text", name, text: await file.text() };
  }

  throw new Error(
    `Unsupported file type ".${ext}". Upload a PDF, DOCX, Markdown, or plain text file — or paste the material as text.`,
  );
}
