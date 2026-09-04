"use client";

import Link from "next/link";
import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowLeft,BookOpenText,CheckCircle2,FilePlus2,Lightbulb,LoaderCircle,Search,Sparkles,WandSparkles} from "lucide-react";
import type {Locale} from "@/lib/i18n";

type Idea={title:string;keyword:string;intent:string;angle:string};
type Article={title:string;slug:string;excerpt:string;body:string;seoTitle:string;seoDescription:string;category:string;tags:string[]};
type AiResult={ideas:Idea[];article:Article;notes:string[];sources:string[];model:string};
type Notice={tone:"success"|"error";text:string};

export function BlogAiStudio({locale,categories}:{locale:Locale;categories:string[]}){
  const ar=locale==="ar";
  const router=useRouter();
  const uniqueCategories=useMemo(()=>Array.from(new Set(categories.map(value=>value.trim()).filter(Boolean))),[categories]);
  const [articleLocale,setArticleLocale]=useState<"AR"|"EN">(ar?"AR":"EN");
  const [topic,setTopic]=useState("");
  const [category,setCategory]=useState(uniqueCategories[0]??(ar?"أدلة تأجير السيارات":"Car Rental Guides"));
  const [busy,setBusy]=useState<"IDEAS"|"DRAFT"|"SAVE"|null>(null);
  const [result,setResult]=useState<AiResult|null>(null);
  const [notice,setNotice]=useState<Notice|null>(null);

  async function run(action:"IDEAS"|"DRAFT"){
    if(action==="DRAFT"&&!topic.trim()){
      setNotice({tone:"error",text:ar?"اكتب موضوع المقال أو اختر فكرة أولًا.":"Enter an article topic or choose an idea first."});
      return;
    }
    setBusy(action);setNotice(null);
    try{
      const response=await fetch("/api/v1/admin/blog/ai",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({action,locale:articleLocale,topic:topic.trim(),category:category.trim()}),
      });
      const payload=await response.json();
      if(response.status===401){window.location.assign("/admin/login?next=%2Fadmin%2Fblog%2Fai");return;}
      if(!response.ok)throw new Error(payload?.error?.message||(ar?"تعذر تشغيل مساعد المقالات.":"Unable to run the article assistant."));
      setResult(payload.data as AiResult);
      setNotice({tone:"success",text:action==="IDEAS"?(ar?"تم تجهيز أفكار مبنية على نية البحث. اختر واحدة وابدأ المسودة.":"SEO ideas are ready. Choose one to start a draft."):(ar?"تم تجهيز المسودة. راجعها ثم أنشئها كمسودة في المحرر.":"Draft generated. Review it, then create it in the editor.")});
    }catch(error){setNotice({tone:"error",text:error instanceof Error?error.message:(ar?"حدث خطأ غير متوقع.":"Unexpected error.")});}
    finally{setBusy(null);}
  }

  function chooseIdea(idea:Idea){
    setTopic(idea.title);
    setResult(null);
    setNotice({tone:"success",text:ar?`تم اختيار الفكرة: ${idea.title}`:`Selected idea: ${idea.title}`});
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function createDraft(){
    const article=result?.article;
    if(!article?.body.trim())return;
    setBusy("SAVE");setNotice(null);
    try{
      const payload={
        locale:articleLocale,
        slug:slugify(article.slug||article.title),
        title:article.title.trim().slice(0,140),
        excerpt:article.excerpt.trim().slice(0,320),
        body:article.body.trim().slice(0,120_000),
        seoTitle:article.seoTitle.trim().slice(0,70),
        seoDescription:article.seoDescription.trim().slice(0,170),
        category:(category.trim()||article.category.trim()||(articleLocale==="AR"?"أدلة تأجير السيارات":"Car Rental Guides")).slice(0,60),
        tags:article.tags.map(tag=>tag.trim().slice(0,50)).filter(tag=>tag.length>=2).slice(0,12),
        coverImageUrl:"",
        coverImageAlt:"",
        featured:false,
        status:"DRAFT" as const,
        authorName:"HandMeKey Editorial",
      };
      if(payload.slug.length<3)payload.slug=`handmekey-guide-${Date.now()}`;
      const response=await fetch("/api/v1/admin/blog",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const saved=await response.json();
      if(response.status===401){window.location.assign("/admin/login?next=%2Fadmin%2Fblog%2Fai");return;}
      if(!response.ok){
        const issues=saved?.error?.issues as Array<{path?:Array<string|number>;message?:string}>|undefined;
        const detail=issues?.map(issue=>`${issue.path?.join(".")||"field"}: ${issue.message}`).join(" · ");
        throw new Error(detail||saved?.error?.message||(ar?"تعذر إنشاء المسودة.":"Unable to create draft."));
      }
      const id=String(saved?.data?.id??"");
      if(!id)throw new Error(ar?"تم الحفظ لكن لم يرجع رقم المقال.":"Draft saved but no article ID was returned.");
      router.push(`/admin/blog/${id}`);
      router.refresh();
    }catch(error){setNotice({tone:"error",text:error instanceof Error?error.message:(ar?"تعذر حفظ المسودة.":"Unable to save draft.")});}
    finally{setBusy(null);}
  }

  const hasDraft=Boolean(result?.article?.body.trim());
  const ideas=result?.ideas??[];

  return <div className="blogAiStudio">
    <header className="adminTopbar blogAiTopbar">
      <div>
        <span className="eyebrow"><Sparkles size={15}/>{ar?"مساعد HandMeKey التحريري":"HandMeKey editorial assistant"}</span>
        <h1>{ar?"AI Article Studio":"AI Article Studio"}</h1>
        <p>{ar?"ابحث عن أفكار ذات قيمة، أنشئ مسودة مفيدة وSEO جاهز، ثم راجعها في محرر المدونة قبل النشر.":"Find useful search opportunities, generate a strong SEO draft, then review it in the normal blog editor before publishing."}</p>
      </div>
      <Link className="secondaryButton" href="/admin/blog"><ArrowLeft size={15}/>{ar?"العودة للمدونة":"Back to blog"}</Link>
    </header>

    {notice&&<div className={`blogCmsNotice ${notice.tone}`}>{notice.text}</div>}

    <section className="adminPanel blogAiComposer">
      <div className="blogAiComposerHead"><div><span className="eyebrow"><WandSparkles size={15}/>{ar?"ابدأ من كلمة أو سؤال":"Start with a query or question"}</span><h2>{ar?"ماذا تريد أن يستهدف المقال؟":"What should the article target?"}</h2></div><span className="blogAiSafety"><CheckCircle2 size={14}/>{ar?"Draft فقط — لا نشر تلقائي":"Draft only — never auto-publishes"}</span></div>
      <div className="blogAiFormGrid">
        <label className="span2">{ar?"الموضوع / الكلمة المستهدفة":"Topic / target query"}<textarea rows={3} value={topic} onChange={event=>setTopic(event.target.value)} maxLength={280} placeholder={ar?"مثال: استئجار سيارة من مطار الملكة علياء — ما الذي يجب أن يعرفه المسافر؟":"Example: Queen Alia Airport car rental — what travelers should know"}/><small>{topic.length}/280</small></label>
        <label>{ar?"لغة المقال":"Article language"}<select value={articleLocale} onChange={event=>setArticleLocale(event.target.value as "AR"|"EN")}><option value="AR">العربية</option><option value="EN">English</option></select></label>
        <label>{ar?"التصنيف":"Category"}<select value={category} onChange={event=>setCategory(event.target.value)}>{uniqueCategories.length===0&&<option value={category}>{category}</option>}{uniqueCategories.map(item=><option value={item} key={item}>{item.replaceAll(" / "," › ")}</option>)}</select></label>
      </div>
      <div className="blogAiActions">
        <button className="secondaryButton" type="button" disabled={Boolean(busy)} onClick={()=>void run("IDEAS")}><Lightbulb size={16}/>{busy==="IDEAS"?(ar?"جارٍ البحث…":"Finding ideas…"):(ar?"اكتشف أفكار SEO":"Discover SEO ideas")}</button>
        <button className="primaryButton" type="button" disabled={Boolean(busy)||!topic.trim()} onClick={()=>void run("DRAFT")}><Sparkles size={16}/>{busy==="DRAFT"?(ar?"جارٍ إنشاء المسودة…":"Generating draft…"):(ar?"أنشئ مقالًا كاملًا":"Generate full article")}</button>
      </div>
    </section>

    {busy&&(busy==="IDEAS"||busy==="DRAFT")&&<section className="adminPanel blogAiLoading"><LoaderCircle className="blogAiSpinner" size={24}/><div><strong>{busy==="IDEAS"?(ar?"نبحث عن زوايا مفيدة…":"Finding useful search angles…"):(ar?"نبحث ونكتب المسودة…":"Researching and writing the draft…")}</strong><span>{ar?"النتيجة لن تنشر تلقائيًا. ستبقى تحت مراجعتك.":"Nothing will be published automatically. You stay in control."}</span></div></section>}

    {ideas.length>0&&<section className="adminPanel blogAiIdeas">
      <div className="blogAdminSectionHead"><div><span className="eyebrow"><Search size={15}/>{ar?"فرص محتوى":"Content opportunities"}</span><h2>{ar?"اختر فكرة للمقال":"Choose an article idea"}</h2></div></div>
      <div className="blogAiIdeaGrid">{ideas.map((idea,index)=><article key={`${idea.title}-${index}`}><div><span>{idea.intent}</span><strong>{idea.title}</strong><small>{idea.keyword}</small><p>{idea.angle}</p></div><button className="secondaryButton" type="button" onClick={()=>chooseIdea(idea)}>{ar?"استخدم هذه الفكرة":"Use this idea"}</button></article>)}</div>
    </section>}

    {hasDraft&&result&&<div className="blogAiResultGrid">
      <section className="adminPanel blogAiDraftPreview">
        <div className="blogAdminSectionHead"><div><span className="eyebrow"><BookOpenText size={15}/>{ar?"المسودة":"Generated draft"}</span><h2>{result.article.title}</h2></div></div>
        <div className="blogAiMetaPreview"><div><small>SEO title</small><strong>{result.article.seoTitle}</strong></div><div><small>SEO description</small><p>{result.article.seoDescription}</p></div><div><small>{ar?"المقدمة":"Excerpt"}</small><p>{result.article.excerpt}</p></div><div><small>Tags</small><p>{result.article.tags.join(" · ")}</p></div></div>
        <div className="blogAiBodyPreview" dir={articleLocale==="AR"?"rtl":"ltr"}>{result.article.body}</div>
      </section>

      <aside className="blogAiReviewRail">
        <section className="adminPanel blogAiPublishCard"><span className="eyebrow"><FilePlus2 size={15}/>{ar?"الخطوة التالية":"Next step"}</span><strong>{ar?"أنشئها كمسودة فقط":"Create as a draft only"}</strong><p>{ar?"سيتم فتح محرر HandMeKey بعدها لتعديل النص، إضافة الصورة، فحص SEO ثم النشر يدويًا.":"HandMeKey editor opens next so you can edit the text, add a cover image, check SEO and publish manually."}</p><button className="primaryButton" disabled={Boolean(busy)} onClick={()=>void createDraft()}>{busy==="SAVE"?<><LoaderCircle className="blogAiSpinner" size={15}/>{ar?"جارٍ الحفظ…":"Saving…"}</>:<><FilePlus2 size={15}/>{ar?"إنشاء المسودة وفتح المحرر":"Create draft & open editor"}</>}</button></section>
        {result.notes.length>0&&<section className="adminPanel blogAiNotes"><span className="eyebrow">{ar?"ملاحظات المراجعة":"Review notes"}</span><ul>{result.notes.map((note,index)=><li key={index}>{note}</li>)}</ul></section>}
        {result.sources.length>0&&<section className="adminPanel blogAiSources"><span className="eyebrow">{ar?"مصادر البحث":"Research sources"}</span><div>{result.sources.map(source=><a href={source} target="_blank" rel="noreferrer" key={source}>{compactUrl(source)}</a>)}</div><small>{ar?"استخدم المصادر للتدقيق قبل النشر، خصوصًا المعلومات التي تتغير مع الوقت.":"Use these sources to verify time-sensitive facts before publishing."}</small></section>}
        <section className="adminPanel blogAiModel"><small>{ar?"الموديل":"Model"}</small><strong>{result.model}</strong></section>
      </aside>
    </div>}
  </div>;
}

function slugify(value:string){return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").replace(/-{2,}/g,"-").slice(0,120);}
function compactUrl(value:string){try{const url=new URL(value);return `${url.hostname}${url.pathname==="/"?"":url.pathname}`.slice(0,80);}catch{return value.slice(0,80);}}
