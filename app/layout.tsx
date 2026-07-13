import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Book Writing Assistant",
  description: "AI-powered book writer/rewriter web app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
