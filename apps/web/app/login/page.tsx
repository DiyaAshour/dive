import Link from "next/link";
import AuthForm from "./auth-form";

export default function LoginPage() {
  return <main className="softBg authPage"><header className="topbar shell"><Link href="/" className="brandMark">B</Link><nav><Link href="/search">Browse hotels</Link></nav></header><section className="shell authShell"><div className="authIntro"><span className="eyebrow">One account, multiple roles</span><h1>Guest, hotel partner, and admin access share one secure identity layer.</h1><p>Hotel permissions are granted separately per property, so a user can manage one hotel without receiving access to another.</p></div><AuthForm /></section></main>;
}
