import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import path from "path";
import { pathToFileURL } from "url";

// Resolve and configure the absolute path to the pdfjs worker for server-side compilation
const workerPath = path.resolve(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
const workerUrl = pathToFileURL(workerPath).href;
PDFParse.setWorker(workerUrl);

// Monkeypatch PDFParse.prototype.getHyperlinks to bypass the bug where it skips links without overlaidText
if (PDFParse.prototype) {
  (PDFParse.prototype as any).getHyperlinks = async function (page: any, viewport: any) {
    const annotations = (await page.getAnnotations({ intent: "display" })) || [];
    const allAnnotations: any[] = [];
    
    for (const i of annotations) {
      if (i.subtype !== "Link") continue;
      const url = i.url ?? i.unsafeUrl;
      if (!url) continue;
      
      const rectVp = viewport.convertToViewportRectangle(i.rect);
      // Add a small coordinate boundary tolerance (2 points)
      const left = Math.min(rectVp[0], rectVp[2]) - 2.0;
      const top = Math.min(rectVp[1], rectVp[3]) - 2.0;
      const right = Math.max(rectVp[0], rectVp[2]) + 2.0;
      const bottom = Math.max(rectVp[1], rectVp[3]) + 2.0;
      
      allAnnotations.push({
        rect: { left, top, right, bottom },
        url,
        text: "",
        used: false,
      });
    }
    
    // Return a custom object mimicking Map.get to match all text elements residing inside the bounding box
    return {
      get(str: string) {
        return allAnnotations;
      },
    } as any;
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let rawText = "";

    if (file.name.endsWith(".pdf")) {
      const parser = new PDFParse({ data: buffer });
      const parsedData = await parser.getText({ parseHyperlinks: true });
      rawText = parsedData.text;
      await parser.destroy().catch(() => {});
    } else if (file.name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else {
      // Default to plain text parsing
      rawText = buffer.toString("utf-8");
    }

    if (!rawText || !rawText.trim()) {
      return NextResponse.json({ error: "No text content could be extracted from the file." }, { status: 422 });
    }

    return NextResponse.json({ text: rawText });
  } catch (error: any) {
    console.error("Resume Parsing API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse the file." }, { status: 500 });
  }
}
