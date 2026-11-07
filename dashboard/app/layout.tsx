import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Social Dashboard", description: "Daily views, followers and top video per platform" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
