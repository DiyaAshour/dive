import Link from "next/link";
import { KeyRound } from "lucide-react";

type BrandProps = Readonly<{
  href?: string;
  inverse?: boolean;
  compact?: boolean;
  label?: string;
  brandName?: string;
  logoUrl?: string | null;
}>;

export function Brand({href = "/", inverse = false, compact = false, label, brandName = "HandMeKey", logoUrl = null}: BrandProps) {
  const accessibleLabel = label ?? `${brandName} home`;
  return <Link href={href} className={`wordmark${inverse ? " inverse" : ""}${compact ? " compact" : ""}${logoUrl ? " hasUploadedLogo" : ""}`} aria-label={accessibleLabel}>
    {logoUrl ? <img className="wordmarkUploadedLogo" src={logoUrl} alt="" aria-hidden="true"/> : <span className="wordmarkIcon" aria-hidden="true"><KeyRound size={compact ? 17 : 19} strokeWidth={2.3}/></span>}
    <span className="wordmarkText">{brandName}</span>
  </Link>;
}
