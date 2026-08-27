"use client";

import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {Archive, CheckCircle2, ExternalLink, FileText, FolderOpen, Globe2, Save, Search, Sparkles, Undo2} from "lucide-react";
import type {Locale} from "@/lib/i18n";

type EditorPost={
  id:string|undefined;
  locale:"EN"|"AR";
  slug:string;
  title:string;
  excerpt:string;
  body:string;
  seoTitle:string;
  seoDescription:string;
  category:string;
  tags:string[];
  coverImageUrl:string|null;
  coverImageAlt:string|null;
  featured:boolean;
  status:"DRAFT"|"PUBLISHED"|"ARCHIVED";
  authorName:string;
  publishedAt?:string|null;
};

type SaveStatus=EditorPost["status"];

const blank:EditorPost={id:undefined,locale:"AR",slug:"",title:"",excerpt:"",body:"",seoTitle:"",seoDescription:"",category:"دليل السفر",tags:[],coverImageUrl:null,coverImageAlt:null,featured:false,status:"DRAFT",authorName:"HandMeKey Editorial",publishedAt:null};
const defaultCategoriesAr=["دليل السفر","فنادق الأردن","عمّان","العقبة","البحر الميت","البتراء","نصائح الحجز","العروض والمكافآت"];
const defaultCategoriesEn=["Travel guide","Jordan hotels","Amman","Aqaba","Dead Sea","Petra","Booking tips","Deals & Rewards"];

export function BlogEditor({locale,initial,categories=[]}:{locale:Locale;initial?:EditorPost;categories?:string[]}){
  const ar=locale==="ar";
  const router=useRouter();
  const [post,setPost]=useState<EditorPost>(initial??blank);
  const [persisted,setPersisted]=useState<EditorPost|null>(initial??null);
  const [tagsText,setTagsText]=useState((initial?.tags??[]).join(", "));
  const [busy,setBusy]=useState<SaveStatus|null>(null);
  const [message,setMessage]=useState<{tone:"success"|"error";text:string}|null>(null);

  const categoryOptions=useMemo(()=>Array.from(new Set([...(ar?defaultCategoriesAr:defaultCategoriesEn),...categories,post.category].map(v=>v.trim()).filter(Boolean))),[ar,categories,post.category]);
  const words=useMemo(()=>post.body.trim()?post.body.trim().split(/\s+/).length:0,[post.body]);
  const h2Count=post.body.match(/^##\s+/gm)?.length??0;
  const cleanTags=useMemo(()=>tagsText.split(",").map(v=>v.trim()).filter(Boolean),[tagsText]);
  const seoChecks=useMemo(()=>[
    post.seoTitle.length>=30&&post.seoTitle.length<=65,
    post.seoDescription.length>=110&&post.seoDescription.length<=165,
    post.excerpt.length>=70,
    words>=700,
    h2Count>=3,
    cleanTags.length>=3,
    !post.coverImageUrl||Boolean(post.coverImageAlt?.trim()),
    slugify(post.slug).length>=3&&post.category.trim().length>=2,
  ],[post,words,h2Count,cleanTags]);
  const seoScore=seoChecks.filter(Boolean).length;
  const dirty=useMemo(()=>{
    if(!persisted)return Boolean(post.title||post.body||post.slug||post.excerpt);
    return JSON.stringify(editorSnapshot(post,cleanTags))!==JSON.stringify(editorSnapshot(persisted,persisted.tags));
  },[post,persisted,cleanTags]);

  function patch<K extends keyof EditorPost>(key:K,value:EditorPost[K]){setPost(current=>({...current,[key]:value}));}
  function titleChanged(value:string){setPost(current=>({...current,title:value,slug:current.slug||slugify(value),seoTitle:current.seoTitle||value.slice(0,65)}));}

  async function save(targetStatus:SaveStatus){
    setBusy(targetStatus);setMessage(null);
    const payload={...post,slug:slugify(post.slug),status:targetStatus,tags:cleanTags,coverImageUrl:post.coverImageUrl??"",coverImageAlt:post.coverImageAlt??""};
    try{
      const response=await fetch(post.id?`/api/v1/admin/blog/${post.id}`:"/api/v1/admin/blog",{method:post.id?"PATCH":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const result=await response.json();
      if(response.status===401){window.location.assign(`/admin/login?next=${encodeURIComponent(post.id?`/admin/blog/${post.id}`:"/admin/blog/new")}`);return;}
      if(!response.ok){
        const issues=result?.error?.issues as Array<{path?:Array<string|number>;message?:string}>|undefined;
        const detail=issues?.map(issue=>`${issue.path?.join(".")||"field"}: ${issue.message}`).join(" · ");
        throw new Error(detail||result?.error?.message||"Unable to save article");
      }
      const raw=result.data as EditorPost;
      const saved:EditorPost={...raw,coverImageUrl:raw.coverImageUrl??null,coverImageAlt:raw.coverImageAlt??null,publishedAt:raw.publishedAt??null};
      setPost(saved);setPersisted(saved);setTagsText(saved.tags.join(", "));
      const publicHref=liveHref(saved);
      setMessage({tone:"success",text:targetStatus==="PUBLISHED"
        ? (ar?`تم نشر المقال بنجاح. أصبح متاحًا الآن على ${publicHref}.`:`Article published successfully. It is now live at ${publicHref}.`)
        : targetStatus==="ARCHIVED"
          ? (ar?"تمت أرشفة المقال ولن يظهر للعامة.":"Article archived and removed from public discovery.")
          : (ar?"تم حفظ المسودة بنجاح.":"Draft saved successfully.")});
      if(!initial?.id&&saved.id)router.replace(`/admin/blog/${saved.id}`);
      router.refresh();
    }catch(error){setMessage({tone:"error",text:error instanceof Error?error.message:(ar?"تعذر حفظ المقال.":"Unable to save article.")});}
    finally{setBusy(null);}
  }

  const savedLive=Boolean(persisted?.id&&persisted.status==="PUBLISHED"&&persisted.publishedAt);
  const publicHref=savedLive&&persisted?liveHref(persisted):"";
  const currentStatus=persisted?.status??"DRAFT";

  return <div className="blogEditorLayout blogCmsEditor">
    <section className="adminPanel blogEditorMain">
      <div className="blogEditorToolbar blogCmsToolbar">
        <div><span className="eyebrow"><FileText size={15}/>{ar?"محرر HandMeKey":"HandMeKey editor"}</span><h2>{post.id?(ar?"تحرير المقال":"Edit article"):(ar?"مقال جديد":"New article")}</h2><div className="blogCmsState"><span className={`blogStatus ${currentStatus.toLowerCase()}`}>{currentStatus}</span>{dirty&&<span className="blogCmsUnsaved">{ar?"تغييرات غير محفوظة":"Unsaved changes"}</span>}</div></div>
        <div className="blogCmsActions">
          {savedLive&&publicHref&&<Link className="secondaryButton" href={publicHref} target="_blank">{ar?"فتح الصفحة المنشورة":"Open live page"}<ExternalLink size={15}/></Link>}
          {post.id&&<button className="secondaryButton" disabled={Boolean(busy)} onClick={()=>void save("DRAFT")}><Save size={15}/>{busy==="DRAFT"?(ar?"جارٍ الحفظ…":"Saving…"):(currentStatus==="PUBLISHED"?(ar?"إلغاء النشر":"Unpublish"):(ar?"حفظ كمسودة":"Save draft"))}</button>}
          {!post.id&&<button className="secondaryButton" disabled={Boolean(busy)} onClick={()=>void save("DRAFT")}><Save size={15}/>{busy==="DRAFT"?(ar?"جارٍ الحفظ…":"Saving…"):(ar?"حفظ المسودة":"Save draft")}</button>}
          <button className="primaryButton" disabled={Boolean(busy)} onClick={()=>void save("PUBLISHED")}><Globe2 size={15}/>{busy==="PUBLISHED"?(ar?"جارٍ النشر…":"Publishing…"):(currentStatus==="PUBLISHED"?(ar?"حفظ وتحديث المنشور":"Update live article"):(ar?"نشر الآن":"Publish now"))}</button>
        </div>
      </div>

      {message&&<div className={`blogEditorNotice blogCmsNotice ${message.tone}`}>{message.text}{message.tone==="success"&&savedLive&&publicHref&&<Link href={publicHref} target="_blank">{ar?" فتح المنشور":" Open article"}</Link>}</div>}

      <div className="blogEditorGrid">
        <label>{ar?"لغة المقال":"Article language"}<select value={post.locale} onChange={e=>patch("locale",e.target.value as "EN"|"AR")}><option value="AR">العربية</option><option value="EN">English</option></select></label>
        <label>{ar?"التصنيف":"Category"}<input list="blog-category-options" value={post.category} onChange={e=>patch("category",e.target.value)} placeholder={ar?"مثال: فنادق الأردن":"Example: Jordan hotels"}/><datalist id="blog-category-options">{categoryOptions.map(category=><option value={category} key={category}/>)}</datalist><small>{ar?"اكتب تصنيفًا جديدًا أو اختر من الموجود.":"Choose an existing category or type a new one."}</small></label>
        <div className="span2 blogCategoryPicker"><span>{ar?"تصنيفات سريعة":"Quick categories"}</span><div>{categoryOptions.slice(0,10).map(category=><button type="button" className={post.category===category?"active":""} onClick={()=>patch("category",category)} key={category}><FolderOpen size={13}/>{category}</button>)}</div></div>
        <label className="span2">{ar?"عنوان المقال":"Article title"}<input value={post.title} onChange={e=>titleChanged(e.target.value)} maxLength={140}/><small>{post.title.length}/140</small></label>
        <label>{ar?"الرابط المختصر (Slug)":"URL slug"}<input dir="ltr" value={post.slug} onChange={e=>patch("slug",slugifyDraft(e.target.value))} onBlur={()=>patch("slug",slugify(post.slug))} placeholder={ar?"فنادق البحر الميت":"dead sea hotels"}/><small>{ar?"اكتب بشكل طبيعي؛ المسافة تتحول تلقائيًا إلى -":"Type naturally; spaces become hyphens automatically."} · {post.slug?`/blog/${post.locale==="AR"?"ar":"en"}/${slugify(post.slug)}`:"/blog/..."}</small></label>
        <label>{ar?"اسم الكاتب":"Author name"}<input value={post.authorName} onChange={e=>patch("authorName",e.target.value)}/></label>
        <label className="span2">{ar?"المقدمة المختصرة":"Excerpt"}<textarea rows={3} value={post.excerpt} onChange={e=>patch("excerpt",e.target.value)} maxLength={320}/><small>{post.excerpt.length}/320</small></label>
        <label className="span2">{ar?"وسوم البحث (افصل بفاصلة)":"Topic tags (comma separated)"}<input value={tagsText} onChange={e=>setTagsText(e.target.value)} placeholder={ar?"فنادق الأردن، البحر الميت، عطلة نهاية الأسبوع":"Jordan hotels, Dead Sea, weekend stay"}/><small>{cleanTags.length}/12 {ar?"وسم":"tags"}</small></label>
        <label className="span2">{ar?"رابط صورة الغلاف":"Cover image URL"}<input dir="ltr" value={post.coverImageUrl??""} onChange={e=>patch("coverImageUrl",e.target.value)} placeholder="https://..."/></label>
        <label className="span2">{ar?"وصف الصورة لمحركات البحث وقارئات الشاشة":"Image alt text"}<input value={post.coverImageAlt??""} onChange={e=>patch("coverImageAlt",e.target.value)} maxLength={180}/></label>
        <label className="blogEditorCheck span2"><input type="checkbox" checked={post.featured} onChange={e=>patch("featured",e.target.checked)}/><span>{ar?"ثبّت المقال كمقال مميز في أعلى المدونة":"Feature this article on the blog landing page"}</span></label>
      </div>

      <div className="blogBodyEditor"><div><strong>{ar?"محتوى المقال":"Article body"}</strong><small>{ar?"استخدم ## للعناوين الرئيسية، ### للعناوين الفرعية، - للقوائم، و **نص** للتغميق.":"Use ## for section headings, ### for subheadings, - for lists, and **text** for bold."}</small></div><textarea dir={post.locale==="AR"?"rtl":"ltr"} rows={30} value={post.body} onChange={e=>patch("body",e.target.value)} placeholder={ar?"## أفضل منطقة للإقامة\n\nاكتب إجابة أصلية ومفيدة...":"## Where to stay\n\nWrite an original, useful answer..."}/><div className="blogBodyStats"><span>{words.toLocaleString()} {ar?"كلمة":"words"}</span><span>{h2Count} H2</span><span>{cleanTags.length} {ar?"وسوم":"tags"}</span></div></div>
    </section>

    <aside className="blogEditorSide">
      <section className="adminPanel blogPublishPanel"><span className="eyebrow"><Globe2 size={15}/>{ar?"النشر":"Publishing"}</span><div className="blogPublishStatus"><strong>{currentStatus}</strong><span>{savedLive?(ar?"النسخة العامة منشورة ومؤكدة في قاعدة البيانات.":"The public version is confirmed as published in the database."):(ar?"لا يوجد رابط عام حتى يتم النشر فعليًا.":"No public link is exposed until publishing succeeds.")}</span></div>{persisted?.publishedAt&&<small>{ar?"نشر في":"Published"}: {new Date(persisted.publishedAt).toLocaleString(ar?"ar-JO":"en-US")}</small>}{savedLive&&publicHref&&<Link className="secondaryButton blogPublishOpen" href={publicHref} target="_blank"><ExternalLink size={14}/>{ar?"فحص الصفحة العامة":"Check public page"}</Link>}{post.id&&currentStatus!=="ARCHIVED"&&<button className="blogArchiveButton" disabled={Boolean(busy)} onClick={()=>void save("ARCHIVED")}><Archive size={14}/>{ar?"أرشفة المقال":"Archive article"}</button>}{post.id&&currentStatus==="ARCHIVED"&&<button className="blogArchiveButton" disabled={Boolean(busy)} onClick={()=>void save("DRAFT")}><Undo2 size={14}/>{ar?"إعادة إلى المسودات":"Restore to draft"}</button>}</section>

      <section className="adminPanel seoPanel"><span className="eyebrow"><Search size={15}/>SEO</span><div className="seoScore"><strong>{seoScore}/8</strong><span>{ar?"جاهزية المحتوى":"content readiness"}</span></div><ul>{[
        ar?"عنوان SEO بين 30 و65 حرفًا":"SEO title is 30–65 characters",
        ar?"وصف SEO بين 110 و165 حرفًا":"SEO description is 110–165 characters",
        ar?"مقدمة مفيدة 70+ حرفًا":"Useful excerpt is 70+ characters",
        ar?"المقال 700+ كلمة":"Article is 700+ words",
        ar?"ثلاثة عناوين H2 على الأقل":"At least three H2 sections",
        ar?"ثلاثة وسوم موضوعية على الأقل":"At least three topic tags",
        ar?"كل صورة لها alt text":"Every cover image has alt text",
        ar?"الرابط والتصنيف جاهزان":"Slug and category are ready",
      ].map((label,index)=><li className={seoChecks[index]?"pass":""} key={label}><CheckCircle2 size={15}/>{label}</li>)}</ul></section>

      <section className="adminPanel seoFields"><span className="eyebrow"><Sparkles size={15}/>{ar?"مظهر Google":"Search appearance"}</span><label>{ar?"عنوان SEO":"SEO title"}<input value={post.seoTitle} onChange={e=>patch("seoTitle",e.target.value)} maxLength={70}/><small>{post.seoTitle.length}/70</small></label><label>{ar?"وصف SEO":"SEO description"}<textarea rows={5} value={post.seoDescription} onChange={e=>patch("seoDescription",e.target.value)} maxLength={170}/><small>{post.seoDescription.length}/170</small></label><div className="searchPreview"><small>handmekey.com › blog › {post.locale==="AR"?"ar":"en"} › {slugify(post.slug)||"article"}</small><strong>{post.seoTitle||post.title||"SEO title"}</strong><p>{post.seoDescription||post.excerpt||"Search description"}</p></div></section>
    </aside>
  </div>;
}

function liveHref(post:Pick<EditorPost,"locale"|"slug">){return `/blog/${post.locale==="AR"?"ar":"en"}/${slugify(post.slug)}`;}
function editorSnapshot(post:EditorPost,tags:string[]){return {locale:post.locale,slug:slugify(post.slug),title:post.title,excerpt:post.excerpt,body:post.body,seoTitle:post.seoTitle,seoDescription:post.seoDescription,category:post.category,tags,coverImageUrl:post.coverImageUrl??"",coverImageAlt:post.coverImageAlt??"",featured:post.featured,authorName:post.authorName,status:post.status};}
function slugifyDraft(value:string){return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-+/g,"").replace(/-{2,}/g,"-").slice(0,120);}
function slugify(value:string){return slugifyDraft(value).replace(/-+$/g,"");}