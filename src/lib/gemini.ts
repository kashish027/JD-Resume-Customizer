// Library to handle Gemini API integrations via direct HTTP calls

export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  links: { label: string; url: string }[];
}

export interface WorkExperience {
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string[];
}

export interface Education {
  institution: string;
  degree: string;
  location: string;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface Project {
  title: string;
  description: string[];
  technologies: string[];
  link?: string;
}

export interface SkillCategory {
  category: string;
  items: string[];
}

export interface StructuredResume {
  personalInfo: PersonalInfo;
  summary: string;
  workExperience: WorkExperience[];
  education: Education[];
  projects: Project[];
  skills: SkillCategory[];
}

export interface ExperienceSuggestion {
  experienceIndex: number;
  bulletIndex: number;
  originalText: string;
  suggestedText: string;
  reason: string;
}

export interface ProjectSuggestion {
  projectIndex: number;
  bulletIndex: number;
  originalText: string;
  suggestedText: string;
  reason: string;
}

export interface TailoredSuggestions {
  experienceSuggestions: ExperienceSuggestion[];
  projectSuggestions: ProjectSuggestion[];
}

/**
 * Common call helper for Gemini API
 */
async function callGemini(prompt: string, apiKey: string, temperature = 0.1, responseSchema?: any): Promise<string> {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody: any = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature,
    },
  };

  if (responseSchema) {
    requestBody.generationConfig.responseSchema = responseSchema;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty response from Gemini API");
  }

  return text;
}

/**
 * Parses raw resume text into StructuredResume JSON
 */
export async function parseResume(rawText: string, apiKey: string): Promise<StructuredResume> {
  const prompt = `You are a resume parsing assistant. Extract all information from the raw resume text below into a structured JSON format.
Make sure all text details are preserved, and DO NOT make up or hallucinate any details.
If dates, locations, or details are missing, leave them empty.

If the raw resume text contains Markdown links (like \`[LinkedIn](https://www.linkedin.com/in/username)\` or other URLs), make sure to parse the label (e.g., "LinkedIn") and extract the exact URL (e.g., "https://www.linkedin.com/in/username") into the "personalInfo.links" array. Also, if there are links in experience bullets or project descriptions, preserve them exactly as they are in the text (e.g. \`[text](url)\`).

Raw Resume Text:
"""
${rawText}
"""

Ensure output strictly adheres to this JSON structure:
{
  "personalInfo": {
    "fullName": "Name of the person",
    "email": "Email address",
    "phone": "Phone number",
    "location": "City, Country or Address",
    "links": [{"label": "LinkedIn/GitHub/Portfolio/etc", "url": "URL link"}]
  },
  "summary": "Short professional summary if present",
  "workExperience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "location": "Location (City, State/Country)",
      "startDate": "Start Date (e.g. Month Year)",
      "endDate": "End Date or 'Present'",
      "description": [
        "Individual accomplishment bullet point 1",
        "Individual accomplishment bullet point 2"
      ]
    }
  ],
  "education": [
    {
      "institution": "School or University Name",
      "degree": "Degree / Field of study (e.g. B.S. in Computer Science)",
      "location": "Location of school",
      "startDate": "Start date",
      "endDate": "Graduation date",
      "description": "Any honors, minor, GPA, etc (optional)"
    }
  ],
  "projects": [
    {
      "title": "Project Name",
      "description": [
        "Project description bullet point 1",
        "Project description bullet point 2"
      ],
      "technologies": ["List of tech used"],
      "link": "Optional project URL"
    }
  ],
  "skills": [
    {
      "category": "Skill category (e.g. Languages, Frameworks, Tools)",
      "items": ["Skill item 1", "Skill item 2"]
    }
  ]
}`;

  const responseText = await callGemini(prompt, apiKey);
  return JSON.parse(responseText.trim()) as StructuredResume;
}

/**
 * Adapts experience and projects to a Job Description
 */
export async function customizeResume(
  resume: StructuredResume,
  jobDescription: string,
  apiKey: string
): Promise<TailoredSuggestions> {
  const prompt = `You are an expert resume customizer. You will help tailor a job seeker's resume bullet points (experience and projects) to strongly match a Job Description (JD).
Your goal is to rephrase and adapt the bullet points in the experience and projects sections to align with the keywords, tools, methodologies, and responsibilities demanded in the JD.

CRITICAL RULES:
1. ACTIVE ALIGNMENT WITHOUT FABRICATION: For each bullet point in the experience and projects sections, compare it with the JD. If the bullet point touches upon a topic, technology, or responsibility mentioned in the JD, actively rephrase the bullet point to align with the JD's terminology and keywords (e.g., if the JD asks for "Scrum delivery" and the bullet describes "delivering features in sprints", rephrase it to use "Scrum/Agile delivery"). Be proactive in identifying these alignment opportunities rather than leaving bullets unchanged.
2. PRESERVE CORE FACTS AND ACCOMPLISHMENTS: Do NOT entirely change the actual content or invent new tasks/responsibilities that the candidate did not do. Keep the core accomplishment, scope, and context of the original bullet.
3. NO HALLUCINATION: Only rephrase or emphasize the EXACT details and accomplishments the user already provided. DO NOT invent, exaggerate, or fabricate any new numbers, metrics (e.g. do not invent "increased performance by 30%" or "saved 20% cost" if not present in the original bullet), technologies they didn't list, companies, dates, or degrees.
4. Keep all company names, school names, dates, locations, and personal details untouched.
5. Propose a tailored version for each bullet point where there is any relevant JD concept to align with, or return the original text if the bullet is completely unrelated to the JD.
6. Provide a brief explanation (reason) for each change.
7. If the original text contains any links, email addresses, or URLs (plain text or Markdown format like [text](url)), you MUST keep them exactly as they are. Do not remove, modify, or break any links.

Input Resume Work Experience:
${JSON.stringify(resume.workExperience, null, 2)}

Input Resume Projects:
${JSON.stringify(resume.projects, null, 2)}

Target Job Description:
"""
${jobDescription}
"""

Output the recommendations strictly in the following JSON format:
{
  "experienceSuggestions": [
    {
      "experienceIndex": 0, // 0-based index of the workExperience array
      "bulletIndex": 0,      // 0-based index of the bullet point in that experience's description
      "originalText": "Original bullet point text",
      "suggestedText": "Tailored bullet point text reflecting JD keywords and requirements",
      "reason": "Short reason explaining why this adjustment helps align with the JD"
    }
  ],
  "projectSuggestions": [
    {
      "projectIndex": 0,    // 0-based index of the projects array
      "bulletIndex": 0,      // 0-based index of the bullet point in that project's description
      "originalText": "Original bullet point text",
      "suggestedText": "Tailored bullet point text reflecting JD keywords and requirements",
      "reason": "Short reason explaining why this adjustment helps align with the JD"
    }
  ]
}`;

  const responseText = await callGemini(prompt, apiKey, 0.35);
  return JSON.parse(responseText.trim()) as TailoredSuggestions;
}
