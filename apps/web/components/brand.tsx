import Link from "next/link";
import { KeyRound } from "lucide-react";

type BrandProps = Readonly<{
  href?: string;
  inverse?: boolean;
  compact?: boolean;
  label?: string;
}>;

export function Brand({href = "/", inverse = false, compact = false, label = "HandMeKey"}: BrandProps) {
  return <Link href={href} className={`wordmark${inverse ? " inverse" : ""}${compact ? " compact" : ""}`} aria-label={label}>
    <span className="wordmarkIcon" aria-hidden="true"><KeyRound size={compact ? 17 : 19} strokeWidth={2.3}/></span>
    <span className="wordmarkText">HandMeKey</span>
  </Link>;
}
