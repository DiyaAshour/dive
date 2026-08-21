import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./phase2.css";

export const metadata: Metadata = {title:"Hotel Booking Platform",description:"Unbranded hotel booking marketplace"};
export default function RootLayout({children}:Readonly<{children:ReactNode}>){return <html lang="en"><body>{children}</body></html>}
