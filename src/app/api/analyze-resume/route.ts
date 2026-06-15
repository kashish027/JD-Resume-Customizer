import { NextRequest, NextResponse } from "next/server";
import { parseResume } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { rawText } = await req.json();

    if (!rawText || !rawText.trim()) {
      return NextResponse.json({ error: "Missing raw resume text." }, { status: 400 });
    }

    // Attempt to read the API key from environment variable, falling back to a client-supplied header
    const serverApiKey = process.env.GEMINI_API_KEY;
    const clientApiKey = req.headers.get("x-gemini-key");
    const apiKey = serverApiKey || clientApiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing. Please configure it in your environment or enter it in settings." },
        { status: 401 }
      );
    }

    const structuredResume = await parseResume(rawText, apiKey);
    return NextResponse.json(structuredResume);
  } catch (error: any) {
    console.error("Analyze Resume API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze resume." }, { status: 500 });
  }
}
