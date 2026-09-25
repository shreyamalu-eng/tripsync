import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import type { ReactNode } from "react";
import type { Viewport } from "next";

export const metadata = {
  title: "TripSync: decide the group trip",
  description: "Everyone answers privately through one link. Get three trips that work for the whole group, and see where each person stands.",
  openGraph: {
    title: "TripSync: let's finally decide this trip",
    description: "1 minute, private, one time. Options unlock when everyone's in.",
  },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f4f2ea" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <div className="top-in">
            <a href="/" className="brand">
              <span className="brand-mark">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 17l6-8 4 5 3-3 5 6" /><circle cx="17" cy="6" r="2" />
                </svg>
              </span>
              TripSync
            </a>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
