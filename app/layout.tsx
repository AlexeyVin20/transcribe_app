import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "AI Транскрипция | Преобразование аудио и видео в текст",
  description: "Мощный инструмент для транскрибирования аудио и видео файлов с помощью передовых AI технологий",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="light" style={{ colorScheme: 'light' }}>
      <body className={`${geist.variable} font-sans antialiased bg-background text-foreground min-h-screen flex flex-col`}>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
