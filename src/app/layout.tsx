import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Adapt | Tailor Resumes Instantly",
  description: "Upload your resume, paste a job description, and tailor your experience and projects instantly to land more interviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
