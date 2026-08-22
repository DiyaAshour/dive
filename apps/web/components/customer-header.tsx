import Link from "next/link";
import { Bell, Building2, UserRound } from "lucide-react";
import { currentUser } from "@/lib/server-session";
import { Brand } from "./brand";
import { SignOutButton } from "./sign-out-button";

type CustomerHeaderProps = Readonly<{minimal?: boolean}>;

export async function CustomerHeader({minimal = false}: CustomerHeaderProps) {
  const user = await currentUser();
  const accountLabel = user?.displayName.trim().split(/\s+/)[0] || "Account";

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
        {user ? <>
          <Link className="accountButton" href="/account" title={`My account · ${user.email}`}><UserRound size={16}/><span>{accountLabel}</span></Link>
          {!minimal && <SignOutButton/>}
        </> : <Link className="accountButton" href="/login"><UserRound size={16}/><span>Sign in</span></Link>}
      </div>
    </div>
  </header>;
}
