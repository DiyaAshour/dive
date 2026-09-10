import Link from "next/link";
import {CustomerHeader} from "@/components/customer-header";

type Section=Readonly<{title:string;paragraphs?:readonly string[];bullets?:readonly string[]}>;

export function LegalPageShell({title,kicker,intro,updated,sections,backLabel="HandMeKey"}:{title:string;kicker:string;intro:string;updated:string;sections:readonly Section[];backLabel?:string}){
  return <main className="legalPage">
    <CustomerHeader/>
    <section className="shell legalHero">
      <Link className="legalBack" href="/">← {backLabel}</Link>
      <span className="eyebrow">{kicker}</span>
      <h1>{title}</h1>
      <p>{intro}</p>
      <small>{updated}</small>
    </section>
    <section className="shell legalContent">
      {sections.map((section)=><article key={section.title}>
        <h2>{section.title}</h2>
        {section.paragraphs?.map((paragraph,index)=><p key={`${section.title}-${index}`}>{paragraph}</p>)}
        {section.bullets&&<ul>{section.bullets.map((item)=><li key={item}>{item}</li>)}</ul>}
      </article>)}
    </section>
  </main>;
}
