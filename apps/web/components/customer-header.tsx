import Link from "next/link";
import { Bell, Building2, UserRound } from "lucide-react";
import { Brand } from "./brand";

type CustomerHeaderProps = Readonly<{minimal?: boolean}>;

export function CustomerHeader({minimal = false}: CustomerHeaderProps) {
  return <header className="siteHeader">
    <div className="shell siteHeaderInner">
      <Brand />
      {!minimal && <nav className="siteNav" aria-label="Primary navigation">
        <Link href="/search">Stays</Link>
        <Link href="/trips">My trips</Link>
        <Link href="/account/alerts"><Bell size={16}/>Price alerts</Link>
      </nav>}
      <div className="siteActions">
        {!minimal && <Link className="partnerEntry" href="/partner"><Building2 size={16}/>List your property</Link>}
        <Link className="accountButton" href="/login"><UserRound size={16}/><span>Sign in</span></Link>
      </div>
    </div>
  </header>;
}
