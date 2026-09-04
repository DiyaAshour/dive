import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { MobileSearchResultsControls } from "./mobile-search-results-controls";
import { SearchStarRatingEnhancer } from "./star-rating-filter";
import { AdvancedSearchFilters } from "./advanced-search-filters";
import { SearchFilterExtras } from "./search-filter-extras";
import "./mobile-search-results.css";
import "./mobile-stay-date-picker.css";

export const metadata: Metadata = {
  robots: {index: false, follow: true, googleBot: {index: false, follow: true}},
};

export default function SearchLayout({children}:{children:ReactNode}){
  return <>{children}<SearchStarRatingEnhancer/><AdvancedSearchFilters/><SearchFilterExtras/><Suspense fallback={null}><MobileSearchResultsControls/></Suspense></>;
}
