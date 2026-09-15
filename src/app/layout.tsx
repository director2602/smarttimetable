import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "S-CUBUS Timetable Management",
  description: "Automatic constraint-based timetable scheduling for S-CUBUS"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
