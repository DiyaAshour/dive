import type { ReactNode } from "react";

export function BlogArticleBody({body}: {body: string}) {
  const blocks = toBlocks(body);
  return <div className="blogArticleBody">{blocks.map((block,index) => {
    switch (block.type) {
      case "h2": return <h2 id={headingId(block.text)} key={index}>{inline(block.text)}</h2>;
      case "h3": return <h3 id={headingId(block.text)} key={index}>{inline(block.text)}</h3>;
      case "quote": return <blockquote key={index}>{inline(block.text)}</blockquote>;
      case "ul": return <ul key={index}>{block.items.map((item,itemIndex)=><li key={itemIndex}>{inline(item)}</li>)}</ul>;
      case "ol": return <ol key={index}>{block.items.map((item,itemIndex)=><li key={itemIndex}>{inline(item)}</li>)}</ol>;
      case "p": return <p key={index}>{inline(block.text)}</p>;
    }
  })}</div>;
}

type Block =
  | {type: "h2"; text: string}
  | {type: "h3"; text: string}
  | {type: "quote"; text: string}
  | {type: "p"; text: string}
  | {type: "ul"; items: string[]}
  | {type: "ol"; items: string[]};

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
    if (list.type === "ul") blocks.push({type:"ul",items:[...list.items]});
    else blocks.push({type:"ol",items:[...list.items]});
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
