import { NextRequest, NextResponse } from "next/server";
import { customizeResume } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json();

    if (!resume) {
      return NextResponse.json({ error: "Missing structured resume data." }, { status: 400 });
    }

    if (!jobDescription || !jobDescription.trim()) {
      return NextResponse.json({ error: "Missing job description." }, { status: 400 });
    }

    // Retrieve API key
    const serverApiKey = process.env.GEMINI_API_KEY;
    const clientApiKey = req.headers.get("x-gemini-key");
    const apiKey = serverApiKey || clientApiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing. Please configure it in your environment or enter it in settings." },
        { status: 401 }
      );
    }

    const suggestions = await customizeResume(resume, jobDescription, apiKey);
    return NextResponse.json(suggestions);
  } catch (error: any) {
    console.error("Customize Resume API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to customize resume." }, { status: 500 });
  }
}
