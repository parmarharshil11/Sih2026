import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Capacity Connect | Industrial Enterprise LMS & Competency Engine",
  description: "Enterprise capacity building, AI-assisted competency matching, automated assessment & verifiable QR certification.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" theme="dark" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
