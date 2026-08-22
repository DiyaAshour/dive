import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./phase2.css";

export const metadata: Metadata = {
  title: {default: "HandMeKey — Hotels, clearly priced", template: "%s · HandMeKey"},
  description: "Search verified hotels, compare live rates and book with the final stay price visible before checkout.",
};

export default function RootLayout({children}: Readonly<{children: ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
