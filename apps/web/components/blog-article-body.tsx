import type { ReactNode } from "react";

export function BlogArticleBody({body}: {body: string}) {
  const blocks = toBlocks(body);
  return <div className="blogArticleBody">{blocks.map((block,index) => {
    if (block.type === "h2") return <h2 id={headingId(block.text)} key={index}>{inline(block.text)}</h2>;
    if (block.type === "h3") return <h3 id={headingId(block.text)} key={index}>{inline(block.text)}</h3>;
    if (block.type === "quote") return <blockquote key={index}>{inline(block.text)}</blockquote>;
    if (block.type === "ul") return <ul key={index}>{block.items.map((item,itemIndex)=><li key={itemIndex}>{inline(item)}</li>)}</ul>;
    if (block.type === "ol") return <ol key={index}>{block.items.map((item,itemIndex)=><li key={itemIndex}>{inline(item)}</li>)}</ol>;
    return <p key={index}>{inline(block.text)}</p>;
  })}</div>;
}

type Block =
  | {type: "h2" | "h3" | "quote" | "p"; text: string}
  | {type: "ul" | "ol"; items: string[]};

function toBlocks(body: string): Block[] {
  const lines = body.replace(/\r\n/g,"\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: {type: "ul" | "ol"; items: string[]} | null = null;
  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({type:"p", text: paragraph.join(" ").trim()});
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    blocks.push(list);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    if (line.startsWith("### ")) { flushParagraph(); flushList(); blocks.push({type:"h3",text:line.slice(4).trim()}); continue; }
    if (line.startsWith("## ")) { flushParagraph(); flushList(); blocks.push({type:"h2",text:line.slice(3).trim()}); continue; }
    if (line.startsWith("> ")) { flushParagraph(); flushList(); blocks.push({type:"quote",text:line.slice(2).trim()}); continue; }
    const unordered = /^[-*]\s+(.+)$/.exec(line);
    if (unordered) { flushParagraph(); if (!list || list.type!=="ul") { flushList(); list={type:"ul",items:[]}; } list.items.push(unordered[1]!); continue; }
    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (ordered) { flushParagraph(); if (!list || list.type!=="ol") { flushList(); list={type:"ol",items:[]}; } list.items.push(ordered[1]!); continue; }
    flushList(); paragraph.push(line);
  }
  flushParagraph(); flushList();
  return blocks;
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part,index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={index}>{part.slice(2,-2)}</strong>
    : part);
}

function headingId(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"").slice(0,80) || "section";
}
