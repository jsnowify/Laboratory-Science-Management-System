import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { CookieNotice } from "@/components/ui/cookie-notice";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LSMS | Laboratory Science Management System",
  description:
    "A clearer workspace for laboratory equipment, borrowing, and accountability.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <FeedbackProvider>
          {children}
          <CookieNotice />
        </FeedbackProvider>
      </body>
    </html>
  );
}
