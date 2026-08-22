import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, KeyRound, LayoutDashboard, Luggage, UserRound } from "lucide-react";
import { CustomerHeader } from "./customer-header";

type AccountSection = "overview" | "profile" | "security" | "trips" | "alerts";

type Props = Readonly<{
  active: AccountSection;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}>;

const links: Array<{key:AccountSection;href:string;label:string;icon:typeof LayoutDashboard}> = [
  {key:"overview",href:"/account",label:"Overview",icon:LayoutDashboard},
  {key:"profile",href:"/account/profile",label:"Personal details",icon:UserRound},
  {key:"security",href:"/account/security",label:"Security",icon:KeyRound},
  {key:"trips",href:"/trips",label:"My trips",icon:Luggage},
  {key:"alerts",href:"/account/alerts",label:"Price alerts",icon:Bell},
];

export function AccountShell({active,eyebrow,title,description,children}: Props) {
  return <main className="accountExperience">
    <CustomerHeader/>
    <div className="shell accountLayout">
      <aside className="accountSidebar">
        <div className="accountSidebarTitle"><UserRound size={18}/><strong>My account</strong></div>
        <nav aria-label="Account navigation">
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
