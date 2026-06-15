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
  const prompt = `You are an expert resume writer and customization assistant. Your task is to tailor a candidate's resume (specifically their work experience and project description bullet points) to align strongly with a target Job Description (JD).

We are providing you with the candidate's full profile (including skills, summary, work experience, and education) to give you rich context on their background. Your modifications must only affect the Work Experience and Projects bullet points.

CRITICAL INSTRUCTIONS FOR TAILORING:
1. ACTIVE ALIGNMENT & REFRAMING:
   - Carefully review the target Job Description to identify core responsibilities, key terms, tools, methodologies, and phrases.
   - For every single bullet point in Work Experience and Projects, determine if the activity described relates directly or indirectly to requirements in the JD.
   - If there is a connection, actively rewrite and reframe the bullet point to highlight the matching skills, terminology, and keywords from the JD. For example, if the JD requires "agile product lifecycle management" and the original bullet describes "leading development from start to launch", rewrite it to frame it as "managed the end-to-end Agile product lifecycle from conception to launch."
   - Do not perform simple word-for-word synonym replacement. Instead, restructure the bullet points to lead with the most relevant accomplishments and skills matching the JD.

2. USE THE ACTION-IMPACT STRUCTURE:
   - Ensure tailored bullets start with a strong, past-tense action verb (or present-tense for current positions) that matches the active style of the JD.
   - Wherever the original bullet provides metrics or outcomes, structure the rewritten bullet to emphasize the action taken and its direct impact (e.g. "Spearheaded [X], resulting in [Y] by implementing [Z]").
` +
/*
`3. NO FABRICATION OR EXTRA-POLATION:
   - You must NOT invent, exaggerate, or fabricate any numbers, percentages, metrics, or accomplishments that the candidate did not list. 
   - If the candidate listed specific skills (e.g., Python, SQL, React) in their "skills" section, you may contextually mention them in experience/project bullets to explain *how* they completed the task, but ONLY if those skills are already present somewhere in the resume. Never introduce technologies or credentials the candidate does not possess.`
*/
`
4. PRESERVE ORIGINAL DATA:
   - Keep all company names, dates, project titles, school names, degrees, and locations exactly as they are.
   - If a bullet contains links, email addresses, or URLs (plain text or markdown like [text](url)), you MUST keep them exactly as they are. Do not remove or modify them.

5. PROVIDE CLEAR JUSTIFICATIONS:
   - For every suggested change, provide a short, professional "reason" explaining which requirement from the JD the change addresses and why it helps the candidate.


6. RETURN UNCHANGED IF UNRELATED:
   - If a bullet point has absolutely no relevance or alignment opportunity with the JD, return the original text.

Input Resume (Full Profile for Context):
${JSON.stringify(resume, null, 2)}

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

