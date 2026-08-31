import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, Gem, KeyRound, LayoutDashboard, Luggage, ReceiptText, UserRound, WalletCards } from "lucide-react";
import { accountShellCopy } from "@/lib/account-shell-copy";
import { guestDictionary } from "@/lib/guest-i18n";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { CustomerHeader } from "./customer-header";

type AccountSection = "overview" | "profile" | "security" | "trips" | "alerts" | "rewards" | "wallet" | "invoices";

type Props = Readonly<{
  active: AccountSection;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}>;

export async function AccountShell({active,eyebrow,title,description,children}: Props) {
  const market = await requestGuestMarket();
  const copy = guestDictionary(market.locale);
  const extra = accountShellCopy(market.locale);
  const links: Array<{key:AccountSection;href:string;label:string;icon:typeof LayoutDashboard}> = [
    {key:"overview",href:"/account",label:copy.account.overview,icon:LayoutDashboard},
    {key:"rewards",href:"/account/rewards",label:extra.rewards,icon:Gem},
    {key:"wallet",href:"/account/wallet",label:extra.wallet,icon:WalletCards},
    {key:"invoices",href:"/account/invoices",label:extra.invoices,icon:ReceiptText},
    {key:"profile",href:"/account/profile",label:copy.account.profile,icon:UserRound},
    {key:"security",href:"/account/security",label:copy.account.security,icon:KeyRound},
    {key:"trips",href:"/trips",label:copy.account.trips,icon:Luggage},
    {key:"alerts",href:"/account/alerts",label:copy.account.alerts,icon:Bell},
  ];

  return <main className="accountExperience" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <div className="shell accountLayout">
      <aside className="accountSidebar">
        <div className="accountSidebarTitle"><UserRound size={18}/><strong>{copy.account.my}</strong></div>
        <nav aria-label={copy.account.my}>
          {links.map(({key,href,label,icon:Icon})=><Link className={active===key?"active":""} href={href} key={key}><Icon size={17}/><span>{label}</span></Link>)}
        </nav>
      </aside>
      <section className="accountMain">
        <header className="accountPageHead"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>
        {children}
      </section>
    </div>
  </main>;
}
