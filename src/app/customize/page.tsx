"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ResumePDF } from "@/components/ResumePDF";
import { 
  ArrowLeft, Upload, FileText, ArrowRight, Check, X, 
  Sparkles, CheckCircle2, Download, RefreshCw, AlertCircle, HelpCircle
} from "lucide-react";
import confetti from "canvas-confetti";

export default function CustomizePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User session
  const [user, setUser] = useState<any>(null);
  const [userGeminiKey, setUserGeminiKey] = useState<string>("");

  // Step wizard: 1 = Inputs, 2 = Loading/Analysis, 3 = Review/Diff, 4 = Preview/Download
  const [step, setStep] = useState(1);
  
  // Form Inputs
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // AI & Processing States
  const [loadingText, setLoadingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const [rawText, setRawText] = useState("");
  const [structuredResume, setStructuredResume] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any>(null);
  
  // Toggle Selection States (Accepted by default)
  const [acceptedExp, setAcceptedExp] = useState<Record<string, boolean>>({});
  const [acceptedProj, setAcceptedProj] = useState<Record<string, boolean>>({});

  // Compilation & PDF Download states
  const [isCompiling, setIsCompiling] = useState(false);
  const [finalTailoredResume, setFinalTailoredResume] = useState<any>(null);

  // Dynamic PDF Spacing & Formatting configurations
  const [pdfFont, setPdfFont] = useState<"Helvetica" | "Times-Roman" | "Courier">("Helvetica");
  const [pdfFontSize, setPdfFontSize] = useState(10);
  const [pdfLineHeight, setPdfLineHeight] = useState(1.35);
  const [pdfMargin, setPdfMargin] = useState(35);
  const [pdfSectionSpacing, setPdfSectionSpacing] = useState(10);
  const [pdfThemeColor, setPdfThemeColor] = useState("#1a252f");

  // Check auth session and load API key
  useEffect(() => {
    if (!isSupabaseConfigured) {
      router.push("/");
      return;
    }

    const checkUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push("/");
      } else {
        setUser(currentUser);
      }
    };
    checkUser();

    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("gemini_api_key");
      if (savedKey) setUserGeminiKey(savedKey);
    }
  }, [router]);

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Run customization engine
  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please upload a resume file.");
      return;
    }
    if (!companyName.trim() || !jobTitle.trim()) {
      setError("Please specify the target Company Name and Job Title.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Please paste a Job Description.");
      return;
    }

    setStep(2);
    
    try {
      // Setup headers (include user client API key if present)
      const headers: Record<string, string> = {};
      if (userGeminiKey) {
        headers["x-gemini-key"] = userGeminiKey;
      }

      // 1. Parse Resume file
      setLoadingText("Step 1/3: Reading uploaded resume file...");
      const formData = new FormData();
      formData.append("file", file);

      const parseRes = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });

      if (!parseRes.ok) {
        const parseErr = await parseRes.json();
        throw new Error(parseErr.error || "Failed to extract text from your resume.");
      }

      const { text: parsedText } = await parseRes.json();
      setRawText(parsedText);

      // 2. Structuring Resume Text into JSON
      setLoadingText("Step 2/3: Analyzing & structuring resume contents...");
      const structureRes = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rawText: parsedText }),
      });

      if (!structureRes.ok) {
        const structErr = await structureRes.json();
        throw new Error(structErr.error || "Failed to analyze and structure resume text.");
      }

      const structJson = await structureRes.json();
      setStructuredResume(structJson);

      // 3. Customizing sections to fit the JD
      setLoadingText("Step 3/3: Tailoring experiences & projects to match job description...");
      const customizeRes = await fetch("/api/customize-resume", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resume: structJson, jobDescription }),
      });

      if (!customizeRes.ok) {
        const custErr = await customizeRes.json();
        throw new Error(custErr.error || "Failed to customize resume to job description.");
      }

      const suggestionsJson = await customizeRes.json();
      setSuggestions(suggestionsJson);

      // Pre-fill all suggestions as accepted by default
      const initialAcceptedExp: Record<string, boolean> = {};
      suggestionsJson.experienceSuggestions.forEach((s: any) => {
        initialAcceptedExp[`${s.experienceIndex}-${s.bulletIndex}`] = true;
      });
      setAcceptedExp(initialAcceptedExp);

      const initialAcceptedProj: Record<string, boolean> = {};
      suggestionsJson.projectSuggestions.forEach((s: any) => {
        initialAcceptedProj[`${s.projectIndex}-${s.bulletIndex}`] = true;
      });
      setAcceptedProj(initialAcceptedProj);

      setStep(3); // Go to diff screen
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during customization.");
      setStep(1);
    }
  };

  // Toggle acceptance of a single suggestion
  const toggleExpSuggestion = (expIdx: number, bulletIdx: number) => {
    const key = `${expIdx}-${bulletIdx}`;
    setAcceptedExp(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleProjSuggestion = (projIdx: number, bulletIdx: number) => {
    const key = `${projIdx}-${bulletIdx}`;
    setAcceptedProj(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Compile final JSON and save history in Supabase
  const handleFinalize = async () => {
    setIsCompiling(true);
    setError(null);

    try {
      // 1. Deep clone structured resume
      const finalResume = JSON.parse(JSON.stringify(structuredResume));

      // 2. Map accepted experience bullet points
      suggestions.experienceSuggestions.forEach((s: any) => {
        const isAccepted = acceptedExp[`${s.experienceIndex}-${s.bulletIndex}`];
        if (isAccepted) {
          finalResume.workExperience[s.experienceIndex].description[s.bulletIndex] = s.suggestedText;
        }
      });

      // 3. Map accepted project bullet points
      suggestions.projectSuggestions.forEach((s: any) => {
        const isAccepted = acceptedProj[`${s.projectIndex}-${s.bulletIndex}`];
        if (isAccepted) {
          finalResume.projects[s.projectIndex].description[s.bulletIndex] = s.suggestedText;
        }
      });

      // 3.5 Attach current layout settings
      finalResume.layoutSettings = {
        fontFamily: pdfFont,
        fontSize: pdfFontSize,
        lineHeight: pdfLineHeight,
        margin: pdfMargin,
        sectionSpacing: pdfSectionSpacing,
        themeColor: pdfThemeColor,
      };

      // 4. Save tailored resume in database history
      const { data, error: dbError } = await supabase
        .from("tailored_resumes")
        .insert({
          user_id: user.id,
          resume_id: "00000000-0000-0000-0000-000000000000", // Placeholder or references a dynamic uploads tracker
          job_title: jobTitle,
          company_name: companyName,
          job_description: jobDescription,
          tailored_json: finalResume,
          suggestions: suggestions,
        })
        .select();

      if (dbError) {
        // If it references resume_id foreign key constraint fail (because we did not insert the original resume to the db table), 
        // we can create a record in public.resumes first and reference its ID!
        // Let's implement that flow to guarantee RDBMS integrity!
        setLoadingText("Saving original resume model in archive...");
        
        const { data: originalResume, error: originalError } = await supabase
          .from("resumes")
          .insert({
            user_id: user.id,
            original_filename: file?.name || "Uploaded Resume",
            raw_text: rawText,
            parsed_json: structuredResume,
          })
          .select()
          .single();

        if (originalError) throw originalError;

        setLoadingText("Archiving your customized resume version...");
        const { data: finalData, error: finalError } = await supabase
          .from("tailored_resumes")
          .insert({
            user_id: user.id,
            resume_id: originalResume.id,
            job_title: jobTitle,
            company_name: companyName,
            job_description: jobDescription,
            tailored_json: finalResume,
            suggestions: suggestions,
          })
          .select();

        if (finalError) throw finalError;
      }

      setFinalTailoredResume(finalResume);
      setStep(4); // Download step

      // Celebrate with confetti!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to compile the final resume.");
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!finalTailoredResume) return;
    
    try {
      setIsCompiling(true);
      const { pdf } = await import("@react-pdf/renderer");
      const doc = (
        <ResumeDocument 
          data={finalTailoredResume} 
          settings={{
            fontFamily: pdfFont,
            fontSize: pdfFontSize,
            lineHeight: pdfLineHeight,
            margin: pdfMargin,
            sectionSpacing: pdfSectionSpacing,
            themeColor: pdfThemeColor,
          }}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      const compName = companyName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const jTitle = jobTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      link.download = `resume_tailored_${compName}_${jTitle}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("PDF download error:", err);
      setError("Failed to export PDF file.");
    } finally {
      setIsCompiling(false);
    }
  };

  // Dynamically alias ResumePDF for local bundle loader safety
  const ResumeDocument = ResumePDF;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header */}
      <header className="navbar">
        <div className="logo-text" style={{ cursor: "pointer" }} onClick={() => router.push("/dashboard")}>
          Resume Adapt
        </div>
        <button className="btn btn-secondary" style={{ padding: "0.5rem 1rem" }} onClick={() => router.push("/dashboard")}>
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="main-content" style={{ padding: "3rem 2rem", flex: 1 }}>
        
        {/* Wizard Steps indicator */}
        <div className="wizard-steps">
          <div className={`wizard-step ${step >= 1 ? "active" : ""} ${step > 1 ? "completed" : ""}`}>1</div>
          <div className={`wizard-step ${step >= 2 ? "active" : ""} ${step > 2 ? "completed" : ""}`}>2</div>
          <div className={`wizard-step ${step >= 3 ? "active" : ""} ${step > 3 ? "completed" : ""}`}>3</div>
          <div className={`wizard-step ${step >= 4 ? "active" : ""} ${step > 4 ? "completed" : ""}`}>4</div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ maxWidth: "800px", marginLeft: "auto", marginRight: "auto" }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* ================= STEP 1: INPUT FORM ================= */}
        {step === 1 && (
          <div className="glass-card" style={{ maxWidth: "800px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Customize Your Resume</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "0.95rem" }}>
              Upload your base resume and enter target job details to begin the personalization process.
            </p>

            <form onSubmit={handleProcess} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="companyName">Target Company</label>
                  <input
                    type="text"
                    id="companyName"
                    className="form-input"
                    placeholder="e.g. Google, Stripe"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="jobTitle">Job Title</label>
                  <input
                    type="text"
                    id="jobTitle"
                    className="form-input"
                    placeholder="e.g. Senior Frontend Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
              </div>

              {/* File Upload Zone */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Upload Base Resume (PDF, DOCX, TXT)</label>
                <div 
                  className={`upload-zone ${dragActive ? "dragging" : ""}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                  />
                  <Upload size={32} color="var(--primary)" />
                  {file ? (
                    <div>
                      <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>{file.name}</p>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB • Click to replace file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontWeight: 500, color: "var(--text-primary)" }}>Drag and drop your file here, or click to browse</p>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                        Supports PDF, DOCX, and TXT files. Max 5MB.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Job Description Paste Area */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="jobDescription">Job Description (JD)</label>
                <textarea
                  id="jobDescription"
                  className="form-textarea"
                  placeholder="Paste the full job description or keywords list here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: "0.85rem", marginTop: "1rem" }}>
                <span>Analyze & Adapt Resume</span>
                <ArrowRight size={18} />
              </button>

            </form>
          </div>
        )}

        {/* ================= STEP 2: LOADING SCREEN ================= */}
        {step === 2 && (
          <div className="glass-card" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center", padding: "4rem 2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem" }}>
            <div style={{ position: "relative" }}>
              <div className="spinner" style={{ width: "80px", height: "80px", borderWidth: "5px" }}></div>
              <Sparkles size={32} color="var(--primary)" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate50%", margin: "-16px 0 0 -16px", animation: "pulse 1.5s infinite" }} />
            </div>
            
            <div>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Tailoring in progress...</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>{loadingText}</p>
            </div>
            
            <div style={{ width: "100%", background: "rgba(255,255,255,0.05)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
              <div className="shimmer" style={{ width: "100%", height: "100%" }}></div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: REVIEW / DIFF SCREEN ================= */}
        {step === 3 && suggestions && (
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div>
                <h2 style={{ fontSize: "2rem" }}>Review Suggested Changes</h2>
                <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                  Accept or reject suggested wording updates for <span style={{ color: "var(--secondary)", fontWeight: 600 }}>{companyName}</span> ({jobTitle}).
                </p>
              </div>
              <button className="btn btn-primary" onClick={handleFinalize} disabled={isCompiling}>
                <span>Approve & Export Resume</span>
                <Check size={18} />
              </button>
            </div>

            {/* Experience Suggestions List */}
            {suggestions.experienceSuggestions.length > 0 && (
              <div style={{ marginBottom: "3rem" }}>
                <h3 style={{ fontSize: "1.25rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", marginBottom: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                  Work Experience Adjustments
                </h3>
                <div className="diff-container">
                  {suggestions.experienceSuggestions.map((s: any, idx: number) => {
                    const key = `${s.experienceIndex}-${s.bulletIndex}`;
                    const isAccepted = acceptedExp[key];
                    const expDetails = structuredResume?.workExperience[s.experienceIndex];

                    return (
                      <div key={idx} className={`diff-card ${isAccepted ? "accepted" : "rejected"}`}>
                        <div className="diff-header">
                          <div>
                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{expDetails?.company}</span> • {expDetails?.role} (Bullet #{s.bulletIndex + 1})
                          </div>
                          
                          {/* Custom Toggle Switch */}
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              className="toggle-input" 
                              checked={isAccepted} 
                              onChange={() => toggleExpSuggestion(s.experienceIndex, s.bulletIndex)} 
                            />
                            <div className="toggle-track">
                              <div className="toggle-thumb"></div>
                            </div>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: isAccepted ? "var(--success)" : "var(--text-muted)" }}>
                              {isAccepted ? "Accepted" : "Rejected"}
                            </span>
                          </label>
                        </div>

                        <div className="diff-body">
                          <div className="diff-section">
                            <span className="diff-label" style={{ color: "var(--danger)" }}>Original bullet</span>
                            <div className="diff-content diff-removed">
                              {s.originalText}
                            </div>
                          </div>
                          <div className="diff-section">
                            <span className="diff-label" style={{ color: "var(--success)" }}>Tailored bullet suggestion</span>
                            <div className="diff-content diff-added">
                              {isAccepted ? s.suggestedText : s.originalText}
                            </div>
                          </div>
                          {s.reason && (
                            <div className="diff-explanation">
                              <strong>Why change:</strong> {s.reason}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Project Suggestions List */}
            {suggestions.projectSuggestions.length > 0 && (
              <div style={{ marginBottom: "3rem" }}>
                <h3 style={{ fontSize: "1.25rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", marginBottom: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                  Project Description Adjustments
                </h3>
                <div className="diff-container">
                  {suggestions.projectSuggestions.map((s: any, idx: number) => {
                    const key = `${s.projectIndex}-${s.bulletIndex}`;
                    const isAccepted = acceptedProj[key];
                    const projDetails = structuredResume?.projects[s.projectIndex];

                    return (
                      <div key={idx} className={`diff-card ${isAccepted ? "accepted" : "rejected"}`}>
                        <div className="diff-header">
                          <div>
                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{projDetails?.title}</span> (Bullet #{s.bulletIndex + 1})
                          </div>
                          
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              className="toggle-input" 
                              checked={isAccepted} 
                              onChange={() => toggleProjSuggestion(s.projectIndex, s.bulletIndex)} 
                            />
                            <div className="toggle-track">
                              <div className="toggle-thumb"></div>
                            </div>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: isAccepted ? "var(--success)" : "var(--text-muted)" }}>
                              {isAccepted ? "Accepted" : "Rejected"}
                            </span>
                          </label>
                        </div>

                        <div className="diff-body">
                          <div className="diff-section">
                            <span className="diff-label" style={{ color: "var(--danger)" }}>Original bullet</span>
                            <div className="diff-content diff-removed">
                              {s.originalText}
                            </div>
                          </div>
                          <div className="diff-section">
                            <span className="diff-label" style={{ color: "var(--success)" }}>Tailored bullet suggestion</span>
                            <div className="diff-content diff-added">
                              {isAccepted ? s.suggestedText : s.originalText}
                            </div>
                          </div>
                          {s.reason && (
                            <div className="diff-explanation">
                              <strong>Why change:</strong> {s.reason}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fallback if no adjustments were proposed */}
            {suggestions.experienceSuggestions.length === 0 && suggestions.projectSuggestions.length === 0 && (
              <div className="glass-card" style={{ textAlign: "center", padding: "3rem", marginBottom: "3rem" }}>
                <CheckCircle2 size={40} color="var(--success)" style={{ marginBottom: "1rem" }} />
                <h3>Your resume is already optimal for this JD!</h3>
                <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                  Gemini analyzed your credentials and found them highly aligned without needing revisions.
                </p>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} />
                <span>Modify Details / Upload Again</span>
              </button>
              <button className="btn btn-primary" onClick={handleFinalize} disabled={isCompiling}>
                {isCompiling ? (
                  <div className="spinner" style={{ width: "18px", height: "18px" }}></div>
                ) : (
                  <>
                    <span>Approve & Export Resume</span>
                    <Check size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: PREVIEW / DOWNLOAD SCREEN ================= */}
        {step === 4 && finalTailoredResume && (
          <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "2rem", alignItems: "start", maxWidth: "1200px", margin: "0 auto" }}>
            {/* Left Column: Layout Settings */}
            <div className="glass-card" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>Formatting Settings</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.75rem" }}>Font Style</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {(["Helvetica", "Times-Roman", "Courier"] as const).map((font) => (
                      <button
                        key={font}
                        type="button"
                        className="btn"
                        style={{
                          flex: 1,
                          padding: "0.5rem",
                          fontSize: "0.85rem",
                          background: pdfFont === font ? "var(--primary)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${pdfFont === font ? "var(--primary)" : "var(--border-color)"}`,
                          color: "#fff"
                        }}
                        onClick={() => setPdfFont(font)}
                      >
                        {font === "Times-Roman" ? "Serif" : font === "Helvetica" ? "Sans" : "Mono"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Font Size</label>
                    <span style={{ fontSize: "0.8rem", color: "var(--secondary)" }}>{pdfFontSize}pt</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="13"
                    step="0.5"
                    value={pdfFontSize}
                    onChange={(e) => setPdfFontSize(parseFloat(e.target.value))}
                    style={{ accentColor: "var(--primary)" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Line Height</label>
                    <span style={{ fontSize: "0.8rem", color: "var(--secondary)" }}>{pdfLineHeight}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.1"
                    max="1.6"
                    step="0.05"
                    value={pdfLineHeight}
                    onChange={(e) => setPdfLineHeight(parseFloat(e.target.value))}
                    style={{ accentColor: "var(--primary)" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Page Margins</label>
                    <span style={{ fontSize: "0.8rem", color: "var(--secondary)" }}>{pdfMargin}pt</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="50"
                    step="2"
                    value={pdfMargin}
                    onChange={(e) => setPdfMargin(parseInt(e.target.value))}
                    style={{ accentColor: "var(--primary)" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Section Spacing</label>
                    <span style={{ fontSize: "0.8rem", color: "var(--secondary)" }}>{pdfSectionSpacing}pt</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    step="1"
                    value={pdfSectionSpacing}
                    onChange={(e) => setPdfSectionSpacing(parseInt(e.target.value))}
                    style={{ accentColor: "var(--primary)" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.75rem" }}>Theme Color</label>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {[
                      { name: "Slate", color: "#1a252f" },
                      { name: "Navy", color: "#0f172a" },
                      { name: "Teal", color: "#064e3b" },
                      { name: "Charcoal", color: "#2e2e2e" },
                      { name: "Indigo", color: "#312e81" }
                    ].map((theme) => (
                      <button
                        key={theme.color}
                        type="button"
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          background: theme.color,
                          border: pdfThemeColor === theme.color ? "2px solid #fff" : "1px solid var(--border-color)",
                          cursor: "pointer",
                          boxShadow: pdfThemeColor === theme.color ? "0 0 10px rgba(255,255,255,0.5)" : "none"
                        }}
                        onClick={() => setPdfThemeColor(theme.color)}
                        title={theme.name}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ background: "rgba(139, 92, 246, 0.05)", borderLeft: "3px solid var(--primary)", padding: "0.75rem", borderRadius: "0 8px 8px 0", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                  <strong>Page Length & Formatting Controls:</strong> Adjust font sizing, line height, margins, and section spacing to customize the alignment and visual weight. Fits A4 pages dynamically.
                </div>
              </div>
            </div>

            {/* Right Column: Preview & Actions */}
            <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", textAlign: "left" }}>
                  <div style={{ padding: "0.5rem", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", color: "var(--success)" }}>
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Customized Resume Compiled</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Review output text alignment below.</p>
                  </div>
                </div>
                
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button className="btn btn-primary" style={{ padding: "0.55rem 1.1rem", fontSize: "0.88rem" }} onClick={handleDownloadPDF} disabled={isCompiling}>
                    {isCompiling ? (
                      <div className="spinner" style={{ width: "16px", height: "16px" }}></div>
                    ) : (
                      <>
                        <Download size={15} />
                        <span>Download PDF</span>
                      </>
                    )}
                  </button>
                  <button className="btn btn-secondary" style={{ padding: "0.55rem 1.1rem", fontSize: "0.88rem" }} onClick={() => router.push("/dashboard")}>
                    <span>Done</span>
                  </button>
                </div>
              </div>

              {/* Real-time dynamic preview container */}
              <div
                style={{
                  textAlign: "left",
                  background: "#fff",
                  color: "#2c3e50",
                  padding: `${pdfMargin * 1.2}px`,
                  borderRadius: "10px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  fontFamily: pdfFont === "Times-Roman" ? "'Times New Roman', Times, serif" : pdfFont === "Courier" ? "Courier, monospace" : "Helvetica, Arial, sans-serif",
                  fontSize: `${pdfFontSize * 1.1}px`,
                  lineHeight: pdfLineHeight,
                  maxHeight: "550px",
                  overflowY: "auto",
                  border: "1px solid var(--border-color)"
                }}
              >
                {/* Header block */}
                <div style={{ borderBottom: `2px solid ${pdfThemeColor}`, paddingBottom: "8px", marginBottom: `${pdfSectionSpacing}px` }}>
                  <h2 style={{ fontSize: `${(pdfFontSize + 8) * 1.1}px`, fontWeight: "bold", color: pdfThemeColor, margin: 0 }}>
                    {finalTailoredResume.personalInfo.fullName}
                  </h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px", fontSize: `${(pdfFontSize - 1.5) * 1.1}px`, color: "#7f8c8d" }}>
                    {finalTailoredResume.personalInfo.email && <span>{finalTailoredResume.personalInfo.email}</span>}
                    {finalTailoredResume.personalInfo.phone && <span>| {finalTailoredResume.personalInfo.phone}</span>}
                    {finalTailoredResume.personalInfo.location && <span>| {finalTailoredResume.personalInfo.location}</span>}
                    {finalTailoredResume.personalInfo.links?.map((link: any, i: number) => (
                      <span key={i}>
                        | <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>
                          {link.label}
                        </a>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                {finalTailoredResume.summary && (
                  <div style={{ marginTop: `${pdfSectionSpacing}px` }}>
                    <h3 style={{ fontSize: `${(pdfFontSize + 1) * 1.1}px`, fontWeight: "bold", color: pdfThemeColor, textTransform: "uppercase", borderBottom: "1px solid #bdc3c7", paddingBottom: "2px", marginBottom: "4px" }}>Summary</h3>
                    <p style={{ margin: 0, fontSize: `${(pdfFontSize - 0.5) * 1.1}px`, color: "#34495e" }}>{finalTailoredResume.summary}</p>
                  </div>
                )}

                {/* Work Experience */}
                {finalTailoredResume.workExperience?.length > 0 && (
                  <div style={{ marginTop: `${pdfSectionSpacing}px` }}>
                    <h3 style={{ fontSize: `${(pdfFontSize + 1) * 1.1}px`, fontWeight: "bold", color: pdfThemeColor, textTransform: "uppercase", borderBottom: "1px solid #bdc3c7", paddingBottom: "2px", marginBottom: "6px" }}>Work Experience</h3>
                    {finalTailoredResume.workExperience.map((exp: any, i: number) => (
                      <div key={i} style={{ marginBottom: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", color: "#2c3e50" }}>
                          <span>{exp.role}</span>
                          <span>{exp.startDate} – {exp.endDate}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#7f8c8d", fontSize: `${(pdfFontSize - 1) * 1.1}px`, marginTop: "1px", marginBottom: "3px" }}>
                          <span>{exp.company}</span>
                          <span>{exp.location}</span>
                        </div>
                        <ul style={{ paddingLeft: "12px", margin: 0, color: "#34495e", fontSize: `${(pdfFontSize - 0.5) * 1.1}px` }}>
                          {exp.description.map((bullet: string, idx: number) => (
                            <li key={idx} style={{ marginBottom: "2px" }}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Projects */}
                {finalTailoredResume.projects?.length > 0 && (
                  <div style={{ marginTop: `${pdfSectionSpacing}px` }}>
                    <h3 style={{ fontSize: `${(pdfFontSize + 1) * 1.1}px`, fontWeight: "bold", color: pdfThemeColor, textTransform: "uppercase", borderBottom: "1px solid #bdc3c7", paddingBottom: "2px", marginBottom: "6px" }}>Projects</h3>
                    {finalTailoredResume.projects.map((proj: any, i: number) => (
                      <div key={i} style={{ marginBottom: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", color: "#2c3e50" }}>
                          <span>{proj.title} {proj.technologies?.length > 0 ? `(${proj.technologies.join(", ")})` : ""}</span>
                          {proj.link && <span style={{ fontSize: `${(pdfFontSize - 1.5) * 1.1}px` }}>{proj.link}</span>}
                        </div>
                        <ul style={{ paddingLeft: "12px", margin: 0, color: "#34495e", fontSize: `${(pdfFontSize - 0.5) * 1.1}px` }}>
                          {proj.description.map((bullet: string, idx: number) => (
                            <li key={idx} style={{ marginBottom: "2px" }}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
