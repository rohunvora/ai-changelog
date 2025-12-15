import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Changelog - Track AI Model Updates & Generate Ideas",
  description:
    "Real-time aggregated changelog of AI model updates from OpenAI, Anthropic, Google, xAI, and more. Generate actionable app ideas from the latest capabilities.",
  keywords: [
    "AI",
    "changelog",
    "OpenAI",
    "Anthropic",
    "Claude",
    "GPT",
    "Gemini",
    "xAI",
    "Grok",
    "updates",
    "LLM",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
