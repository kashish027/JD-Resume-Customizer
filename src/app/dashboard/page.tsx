"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ResumePDF } from "@/components/ResumePDF";
import { 
  Plus, Settings, LogOut, FileText, Download, Trash2, Calendar, 
  Briefcase, Building, Key, X, ExternalLink, HelpCircle 
} from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize and check session
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
        fetchHistory(currentUser.id);
      }
    };
    checkUser();

    // Load custom API key from localStorage if present
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("gemini_api_key");
      if (savedKey) setCustomApiKey(savedKey);
    }
  }, [router]);

  const fetchHistory = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error: dbError } = await supabase
        .from("tailored_resumes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;
      setHistory(data || []);
    } catch (err: any) {
      console.error("Error fetching resume history:", err);
      setError("Failed to load resume history.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (item: any) => {
    try {
      setActionLoading(item.id);
      setError(null);

      // Dynamically import to prevent SSR document undefined crashes
      const { pdf } = await import("@react-pdf/renderer");
      
      // Load custom layout formatting settings if they were saved in the JSON payload
      const settings = item.tailored_json?.layoutSettings || undefined;
      const doc = <ResumePDF data={item.tailored_json} settings={settings} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      // Sanitize name for filename
      const company = item.company_name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const title = item.job_title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      link.download = `resume_${company}_${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess(`Downloaded resume for ${item.company_name}!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error generating PDF:", err);
      setError("Failed to compile and download PDF.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resume from your history?")) return;

    try {
      setActionLoading(id);
      const { error: deleteError } = await supabase
        .from("tailored_resumes")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setHistory(prev => prev.filter(item => item.id !== id));
      setSuccess("Resume deleted successfully.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error deleting resume:", err);
      setError("Failed to delete the resume.");
    } finally {
      setActionLoading(null);
    }
  };

  const saveApiKey = () => {
    try {
      if (customApiKey.trim()) {
        localStorage.setItem("gemini_api_key", customApiKey.trim());
        setSuccess("Gemini API key saved to your browser storage.");
      } else {
        localStorage.removeItem("gemini_api_key");
        setSuccess("Custom API key removed. Will use server key if available.");
      }
      setIsModalOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Failed to save the API key.");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Navbar */}
      <header className="navbar">
        <div className="logo-text" style={{ cursor: "pointer" }} onClick={() => router.push("/dashboard")}>
          Resume Adapt
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button className="btn btn-secondary" style={{ padding: "0.5rem 1rem" }} onClick={() => setIsModalOpen(true)}>
            <Settings size={16} />
            <span>API Settings</span>
          </button>
          <button className="btn btn-danger" style={{ padding: "0.5rem 1rem" }} onClick={handleSignOut}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="main-content" style={{ padding: "3rem 2rem", flex: 1 }}>
        {/* Welcome Section & CTA */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "2.25rem", marginBottom: "0.5rem" }}>Your Resumes</h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Welcome back, <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{user?.email}</span>. Customize and view your tailored applications here.
            </p>
          </div>
          <button className="btn btn-primary" style={{ padding: "0.85rem 1.75rem" }} onClick={() => router.push("/customize")}>
            <Plus size={18} />
            <span>Customize New Resume</span>
          </button>
        </div>

        {/* Global Notifications */}
        {error && <div className="alert alert-error" style={{ maxWidth: "600px" }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ maxWidth: "600px" }}>{success}</div>}

        {/* History Grid */}
        {loading ? (
          <div className="history-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card shimmer history-card" style={{ borderStyle: "solid" }}></div>
            ))}
          </div>
        ) : history.length === 0 ? (
          /* Empty State */
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem 2rem", textAlign: "center", gap: "1.5rem" }}>
            <div style={{ padding: "1.25rem", borderRadius: "50%", background: "rgba(139, 92, 246, 0.1)", color: "var(--primary)" }}>
              <FileText size={48} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>No tailored resumes yet</h3>
              <p style={{ color: "var(--text-secondary)", maxWidth: "450px" }}>
                Adapt your first resume to match a job description. We'll store your history here for easy access.
              </p>
            </div>
            <button className="btn btn-primary" style={{ padding: "0.75rem 1.5rem" }} onClick={() => router.push("/customize")}>
              <Plus size={18} />
              <span>Tailor Your First Resume</span>
            </button>
          </div>
        ) : (
          /* Resume List */
          <div className="history-grid">
            {history.map((item) => (
              <div key={item.id} className="glass-card history-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div className="history-meta">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--secondary)", fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                    <Building size={14} />
                    <span>{item.company_name}</span>
                  </div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
                    {item.job_title}
                  </h3>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    <Calendar size={14} />
                    <span>Adapted on {new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>

                <div className="history-actions">
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1, padding: "0.65rem" }} 
                    disabled={actionLoading === item.id}
                    onClick={() => handleDownload(item)}
                  >
                    {actionLoading === item.id ? (
                      <div className="spinner" style={{ width: "16px", height: "16px" }}></div>
                    ) : (
                      <>
                        <Download size={16} />
                        <span>Download PDF</span>
                      </>
                    )}
                  </button>
                  <button 
                    className="btn btn-danger" 
                    style={{ padding: "0.65rem", width: "40px" }} 
                    disabled={actionLoading === item.id}
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* API Key settings modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Key size={20} color="var(--primary)" />
                <h3 style={{ fontSize: "1.25rem" }}>Gemini API Settings</h3>
              </div>
              <button 
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5", marginBottom: "1.5rem" }}>
              If you haven't set the <code>GEMINI_API_KEY</code> on your server, you can supply your own personal API key here. It will only be stored locally in your browser cache.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="apiKey">Gemini API Key</label>
              <input
                type="password"
                id="apiKey"
                className="form-input"
                placeholder="AIzaSy..."
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.02)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", marginBottom: "1.5rem", lineHeight: "1.4" }}>
              <HelpCircle size={16} style={{ flexShrink: 0 }} />
              <span>
                You can obtain a free Gemini API key from the <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--secondary)", textDecoration: "underline" }}>Google AI Studio <ExternalLink size={10} style={{ display: "inline" }} /></a>.
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveApiKey}>
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
