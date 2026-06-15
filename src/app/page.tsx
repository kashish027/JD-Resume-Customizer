"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Sparkles, CheckCircle, Shield, FileText, Lock, Mail, ArrowRight } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push("/dashboard");
      }
    };
    checkUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isSupabaseConfigured) {
      setError("Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.");
      return;
    }

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        
        router.push("/dashboard");
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : "",
          },
        });

        if (signUpError) throw signUpError;

        setMessage("Registration successful! Please check your email for the verification link (or log in directly if email verification is disabled in your Supabase console).");
      }
    } catch (err: any) {
      setError(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Premium Header */}
      <header className="navbar" style={{ borderBottom: "1px solid var(--border-color)", padding: "1.25rem 2rem" }}>
        <div className="logo-text">Resume Adapt</div>
        <div style={{ display: "flex", gap: "1rem" }}>
          {mounted && !isSupabaseConfigured && (
            <span style={{ fontSize: "0.8rem", color: "var(--danger)", padding: "0.25rem 0.5rem", borderRadius: "4px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
              Missing Env Config
            </span>
          )}
        </div>
      </header>

      {/* Main Grid Hero & Auth Card */}
      <main className="main-content" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "4rem", alignItems: "center", padding: "4rem 2rem", flex: 1 }}>
        {/* Left Side: Product Intro */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderRadius: "99px", background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.2)", marginBottom: "1.5rem" }}>
              <Sparkles size={16} color="var(--primary)" />
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#a78bfa" }}>Next-Gen Resume Customization</span>
            </div>
            <h1 style={{ fontSize: "3.5rem", lineHeight: "1.15", fontWeight: 800, background: "linear-gradient(135deg, #fff 40%, var(--primary) 70%, var(--secondary) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "1rem" }}>
              Stop Applying with Generic Resumes.
            </h1>
            <p style={{ fontSize: "1.2rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
              Upload your resume, paste the job description, and tailor your experience and projects in seconds. Review changes side-by-side and download a professional PDF.
            </p>
          </div>

          {/* Benefits Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <CheckCircle size={20} color="var(--secondary)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <h4 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>100% Personal Info Safe</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Your phone, email, and basic credentials remain untouched.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Shield size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <h4 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>No Hallucinated Data</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Only rephrases your existing points. No fake facts or metrics.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <FileText size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <h4 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Interactive Review</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Accept or reject suggestions with a granular side-by-side diff.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Lock size={20} color="var(--secondary)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <h4 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Secure History Log</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>All past resumes are stored privately in your personal archive.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="glass-card" style={{ maxWidth: "450px", width: "100%", justifySelf: "end" }}>
          <h2 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "2rem" }}>
            {isLogin ? "Sign in to access your resumes & history" : "Get started adapting your resumes for free"}
          </p>

          {mounted && !isSupabaseConfigured && (
            <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
              <div>
                <p style={{ fontWeight: 600 }}>Supabase Credentials Required</p>
                <p style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                  To enable authentication and database storing, please copy <code>.env.example</code> to <code>.env.local</code> and fill in:
                </p>
                <code style={{ display: "block", background: "rgba(0,0,0,0.3)", padding: "0.5rem", borderRadius: "4px", fontSize: "0.75rem", marginTop: "0.5rem", overflowX: "auto" }}>
                  NEXT_PUBLIC_SUPABASE_URL=...<br />
                  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
                </code>
              </div>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="email">Email Address</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  style={{ paddingLeft: "2.5rem" }}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="password"
                  id="password"
                  className="form-input"
                  style={{ paddingLeft: "2.5rem" }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.85rem", marginTop: "1rem" }} disabled={loading}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div className="spinner" style={{ width: "18px", height: "18px" }}></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span>{isLogin ? "Sign In" : "Register"}</span>
                  <ArrowRight size={16} />
                </div>
              )}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <button
              onClick={() => setIsLogin(!isLogin)}
              style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.9rem", cursor: "pointer" }}
              disabled={loading}
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
