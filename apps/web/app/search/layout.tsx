import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MobileSearchResultsControls } from "./mobile-search-results-controls";
import "./mobile-search-results.css";

export const metadata: Metadata = {
  robots: {index: false, follow: true, googleBot: {index: false, follow: true}},
};

export default function SearchLayout({children}:{children:ReactNode}){
  return <>{children}<MobileSearchResultsControls/></>;
}
