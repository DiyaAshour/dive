"use client";

import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {CheckCircle2, ExternalLink, FileText, Search, Sparkles} from "lucide-react";
import type {Locale} from "@/lib/i18n";

type EditorPost={
  id:string|undefined; locale:"EN"|"AR"; slug:string; title:string; excerpt:string; body:string; seoTitle:string; seoDescription:string;
  category:string; tags:string[]; coverImageUrl:string|null; coverImageAlt:string|null; featured:boolean; status:"DRAFT"|"PUBLISHED"|"ARCHIVED"; authorName:string;
};

const blank:EditorPost={id:undefined,locale:"AR",slug:"",title:"",excerpt:"",body:"",seoTitle:"",seoDescription:"",category:"دليل السفر",tags:[],coverImageUrl:null,coverImageAlt:null,featured:false,status:"DRAFT",authorName:"HandMeKey Editorial"};

export function BlogEditor({locale,initial}:{locale:Locale;initial?:EditorPost}){
  const ar=locale==="ar"; const router=useRouter(); const [post,setPost]=useState<EditorPost>(initial??blank); const [tagsText,setTagsText]=useState((initial?.tags??[]).join(", ")); const [busy,setBusy]=useState(false); const [message,setMessage]=useState<string|null>(null);
  const words=useMemo(()=>post.body.trim()?post.body.trim().split(/\s+/).length:0,[post.body]);
  const seoChecks=useMemo(()=>[
    post.seoTitle.length>=30&&post.seoTitle.length<=65,
    post.seoDescription.length>=110&&post.seoDescription.length<=165,
    post.excerpt.length>=70,
    words>=700,
    (post.body.match(/^##\s+/gm)?.length??0)>=3,
    tagsText.split(",").map(v=>v.trim()).filter(Boolean).length>=3,
    !post.coverImageUrl||Boolean(post.coverImageAlt?.trim()),
  ],[post,words,tagsText]);
  const seoScore=seoChecks.filter(Boolean).length;

  function patch<K extends keyof EditorPost>(key:K,value:EditorPost[K]){setPost(current=>({...current,[key]:value}));}
  function titleChanged(value:string){setPost(current=>({...current,title:value,slug:current.slug||slugify(value),seoTitle:current.seoTitle||value.slice(0,65)}));}

  async function save(){
    setBusy(true);setMessage(null);
    const payload={...post,tags:tagsText.split(",").map(v=>v.trim()).filter(Boolean),coverImageUrl:post.coverImageUrl??"",coverImageAlt:post.coverImageAlt??""};
    try{
      const response=await fetch(post.id?`/api/v1/admin/blog/${post.id}`:"/api/v1/admin/blog",{method:post.id?"PATCH":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const result=await response.json();
      if(response.status===401){window.location.assign(`/admin/login?next=${encodeURIComponent(post.id?`/admin/blog/${post.id}`:"/admin/blog/new")}`);return;}
      if(!response.ok){const issues=result?.error?.issues as Array<{path?:Array<string|number>;message?:string}>|undefined;const detail=issues?.map(issue=>`${issue.path?.join(".")||"field"}: ${issue.message}`).join(" · ");throw new Error(detail||result?.error?.message||"Unable to save article");}
      const saved=result.data as EditorPost; setPost({...saved,coverImageUrl:saved.coverImageUrl??null,coverImageAlt:saved.coverImageAlt??null}); setTagsText(saved.tags.join(", ")); setMessage(ar?"تم حفظ المقال بنجاح.":"Article saved successfully.");
      if(!initial?.id&&saved.id)router.replace(`/admin/blog/${saved.id}`); else router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:(ar?"تعذر حفظ المقال.":"Unable to save article."));}finally{setBusy(false);}
  }

  const publicLocale=post.locale==="AR"?"ar":"en"; const publicHref=post.slug?`/blog/${publicLocale}/${post.slug}`:"";
  return <div className="blogEditorLayout">
    <section className="adminPanel blogEditorMain">
      <div className="blogEditorToolbar"><div><span className="eyebrow"><FileText size={15}/>{ar?"محرر المقال":"Article editor"}</span><h2>{post.id?(ar?"تحرير المحتوى":"Edit content"):(ar?"مقال جديد":"New article")}</h2></div><div>{post.status==="PUBLISHED"&&publicHref&&<Link className="secondaryButton" href={publicHref} target="_blank">{ar?"فتح المنشور":"Open published"}<ExternalLink size={15}/></Link>}<button className="primaryButton" disabled={busy} onClick={save}>{busy?(ar?"جارٍ الحفظ…":"Saving..."):(ar?"حفظ المقال":"Save article")}</button></div></div>
      {message&&<div className="blogEditorNotice">{message}</div>}
      <div className="blogEditorGrid">
        <label>{ar?"لغة المقال":"Article language"}<select value={post.locale} onChange={e=>patch("locale",e.target.value as "EN"|"AR")}><option value="AR">العربية</option><option value="EN">English</option></select></label>
        <label>{ar?"الحالة":"Status"}<select value={post.status} onChange={e=>patch("status",e.target.value as EditorPost["status"])}><option value="DRAFT">DRAFT</option><option value="PUBLISHED">PUBLISHED</option><option value="ARCHIVED">ARCHIVED</option></select></label>
        <label className="span2">{ar?"عنوان المقال":"Article title"}<input value={post.title} onChange={e=>titleChanged(e.target.value)} maxLength={140}/><small>{post.title.length}/140</small></label>
        <label>{ar?"الرابط المختصر (Slug)":"URL slug"}<input dir="ltr" value={post.slug} onChange={e=>patch("slug",slugify(e.target.value))} placeholder={ar?"فنادق-البحر-الميت":"dead-sea-hotels"}/><small>{publicHref||"/blog/..."}</small></label>
        <label>{ar?"التصنيف":"Category"}<input value={post.category} onChange={e=>patch("category",e.target.value)} placeholder={ar?"فنادق الأردن":"Jordan hotels"}/></label>
        <label className="span2">{ar?"المقدمة المختصرة":"Excerpt"}<textarea rows={3} value={post.excerpt} onChange={e=>patch("excerpt",e.target.value)} maxLength={320}/><small>{post.excerpt.length}/320</small></label>
        <label>{ar?"اسم الكاتب":"Author name"}<input value={post.authorName} onChange={e=>patch("authorName",e.target.value)}/></label>
        <label>{ar?"وسوم البحث (افصل بفاصلة)":"Topic tags (comma separated)"}<input value={tagsText} onChange={e=>setTagsText(e.target.value)} placeholder={ar?"فنادق الأردن، البحر الميت، عطلة نهاية الأسبوع":"Jordan hotels, Dead Sea, weekend stay"}/></label>
        <label className="span2">{ar?"رابط صورة الغلاف":"Cover image URL"}<input dir="ltr" value={post.coverImageUrl??""} onChange={e=>patch("coverImageUrl",e.target.value)} placeholder="https://..."/></label>
        <label className="span2">{ar?"وصف الصورة لمحركات البحث وقارئات الشاشة":"Image alt text"}<input value={post.coverImageAlt??""} onChange={e=>patch("coverImageAlt",e.target.value)} maxLength={180}/></label>
        <label className="blogEditorCheck span2"><input type="checkbox" checked={post.featured} onChange={e=>patch("featured",e.target.checked)}/><span>{ar?"مقال مميز في أعلى المدونة":"Feature this article on the blog landing page"}</span></label>
      </div>
      <div className="blogBodyEditor"><div><strong>{ar?"محتوى المقال":"Article body"}</strong><small>{ar?"استخدم ## للعناوين الرئيسية، ### للعناوين الفرعية، - للقوائم، و **نص** للتغميق.":"Use ## for section headings, ### for subheadings, - for lists, and **text** for bold."}</small></div><textarea dir={post.locale==="AR"?"rtl":"ltr"} rows={28} value={post.body} onChange={e=>patch("body",e.target.value)} placeholder={ar?"## أفضل منطقة للإقامة\n\nاكتب إجابة أصلية ومفيدة...":"## Where to stay\n\nWrite an original, useful answer..."}/><div className="blogBodyStats"><span>{words.toLocaleString()} {ar?"كلمة":"words"}</span><span>{post.body.match(/^##\s+/gm)?.length??0} H2</span></div></div>
    </section>

    <aside className="blogEditorSide">
      <section className="adminPanel seoPanel"><span className="eyebrow"><Search size={15}/>SEO</span><div className="seoScore"><strong>{seoScore}/7</strong><span>{ar?"جاهزية المحتوى":"content readiness"}</span></div><ul>{[
        ar?"عنوان SEO بين 30 و65 حرفًا":"SEO title is 30–65 characters",
        ar?"وصف SEO بين 110 و165 حرفًا":"SEO description is 110–165 characters",
        ar?"مقدمة مفيدة 70+ حرفًا":"Useful excerpt is 70+ characters",
        ar?"المقال 700+ كلمة":"Article is 700+ words",
        ar?"ثلاثة عناوين H2 على الأقل":"At least three H2 sections",
        ar?"ثلاثة وسوم موضوعية على الأقل":"At least three topic tags",
        ar?"كل صورة لها alt text":"Every cover image has alt text",
      ].map((label,index)=><li className={seoChecks[index]?"pass":""} key={label}><CheckCircle2 size={15}/>{label}</li>)}</ul></section>
      <section className="adminPanel seoFields"><span className="eyebrow"><Sparkles size={15}/>{ar?"مظهر Google":"Search appearance"}</span><label>{ar?"عنوان SEO":"SEO title"}<input value={post.seoTitle} onChange={e=>patch("seoTitle",e.target.value)} maxLength={70}/><small>{post.seoTitle.length}/70</small></label><label>{ar?"وصف SEO":"SEO description"}<textarea rows={5} value={post.seoDescription} onChange={e=>patch("seoDescription",e.target.value)} maxLength={170}/><small>{post.seoDescription.length}/170</small></label><div className="searchPreview"><small>handmekey.com › blog › {publicLocale}</small><strong>{post.seoTitle||post.title||"SEO title"}</strong><p>{post.seoDescription||post.excerpt||"Search description"}</p></div></section>
    </aside>
  </div>;
}

function slugify(value:string){return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"").slice(0,120);}
