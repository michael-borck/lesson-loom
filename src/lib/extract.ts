import mammoth from "mammoth/mammoth.browser";
import type { MaterialInput } from "../types";

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

export async function extractMaterial(file: File): Promise<MaterialInput> {
  const name = file.name;
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();

  if (ext === "pdf") {
    if (file.size > 30 * 1024 * 1024) {
      throw new Error("PDF is too large (max ~30 MB).");
    }
    // PDFs are sent to the API natively as a document block — no client-side
    // text extraction needed, and Claude can also read figures/diagrams.
    return { kind: "pdf", name, base64: await fileToBase64(file) };
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
