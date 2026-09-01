import Link from "next/link";

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

const DEFAULT_HEADER_LOGO = "/brand/handmekey-header-on-light.svg";
const DEFAULT_HEADER_LOGO_INVERSE = "/brand/handmekey-header-on-dark.svg";
const DEFAULT_MARK = "/brand/hmk-favicon-light.svg";
const DEFAULT_MARK_INVERSE = "/brand/hmk-favicon-dark.svg";

export function Brand({href = "/", inverse = false, compact = false, label, brandName = "HandMeKey", logoUrl = null, wordmarkUrl = null, lightLogoUrl = null}: BrandProps) {
  const accessibleLabel = label ?? `${brandName} home`;
  const uploadedWordmark = inverse ? lightLogoUrl ?? wordmarkUrl : wordmarkUrl;
  const fullLogo = uploadedWordmark ?? (logoUrl ? null : inverse ? DEFAULT_HEADER_LOGO_INVERSE : DEFAULT_HEADER_LOGO);
  const mark = logoUrl ?? (inverse ? DEFAULT_MARK_INVERSE : DEFAULT_MARK);

  return <Link href={href} className={`wordmark${inverse ? " inverse" : ""}${compact ? " compact" : ""}${logoUrl || uploadedWordmark ? " hasUploadedLogo" : ""}${fullLogo ? " hasFullWordmark" : ""}`} aria-label={accessibleLabel}>
    {fullLogo ? <img className="wordmarkFullLogo" style={{height:compact ? 30 : 36,width:"auto",maxWidth:compact ? 178 : 215,objectFit:"contain"}} src={fullLogo} alt="" aria-hidden="true"/> : <>
      <img className="wordmarkUploadedLogo" src={mark} alt="" aria-hidden="true"/>
      <span className="wordmarkText">{brandName}</span>
    </>}
  </Link>;
}
