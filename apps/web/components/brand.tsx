import Link from "next/link";
import { KeyRound } from "lucide-react";

type BrandProps = Readonly<{
  href?: string;
  inverse?: boolean;
  compact?: boolean;
  label?: string;
  brandName?: string;
  logoUrl?: string | null;
  wordmarkUrl?: string | null;
  lightLogoUrl?: string | null;
}>;

export function Brand({href = "/", inverse = false, compact = false, label, brandName = "HandMeKey", logoUrl = null, wordmarkUrl = null, lightLogoUrl = null}: BrandProps) {
  const accessibleLabel = label ?? `${brandName} home`;
  const fullLogo = inverse ? lightLogoUrl ?? wordmarkUrl : wordmarkUrl;
  return <Link href={href} className={`wordmark${inverse ? " inverse" : ""}${compact ? " compact" : ""}${logoUrl || fullLogo ? " hasUploadedLogo" : ""}${fullLogo ? " hasFullWordmark" : ""}`} aria-label={accessibleLabel}>
    {fullLogo ? <img className="wordmarkFullLogo" style={{height:compact ? 28 : 34,width:"auto",maxWidth:compact ? 150 : 190,objectFit:"contain"}} src={fullLogo} alt="" aria-hidden="true"/> : <>
      {logoUrl ? <img className="wordmarkUploadedLogo" src={logoUrl} alt="" aria-hidden="true"/> : <span className="wordmarkIcon" aria-hidden="true"><KeyRound size={compact ? 17 : 19} strokeWidth={2.3}/></span>}
      <span className="wordmarkText">{brandName}</span>
    </>}
  </Link>;
}
