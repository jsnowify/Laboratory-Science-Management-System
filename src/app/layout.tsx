import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { FeedbackProvider } from "@/components/ui/feedback-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LSMS | Laboratory Science Management System",
  description: "Laboratory equipment and borrowing management for the Research and Laboratory Services Center.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><FeedbackProvider>{children}</FeedbackProvider></body>
    </html>
  );
}
