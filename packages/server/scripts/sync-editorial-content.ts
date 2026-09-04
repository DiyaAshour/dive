import {readdir,readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {blogPostInputSchema,type BlogPostInput} from "@platform/contracts";
import {database} from "@platform/database";

const here=path.dirname(fileURLToPath(import.meta.url));
const repoRoot=path.resolve(here,"../../..");
const editorialDir=path.join(repoRoot,"content","editorial");
const systemActor="system:editorial-sync";

async function main(){
  const files=await listJsonFiles();
  if(files.length===0){
    console.log("[editorial-sync] no queued editorial JSON files; nothing to sync");
    return;
  }

  let created=0,updated=0,unchanged=0,protectedCount=0;
  for(const file of files){
    const articles=await readArticles(file);
    for(const input of articles){
      const existing=await database().blogPost.findFirst({where:{locale:input.locale,slug:input.slug}});
      if(existing&&existing.status!=="DRAFT"){
        protectedCount++;
        console.log(`[editorial-sync] protected ${existing.status.toLowerCase()} ${input.locale}/${input.slug}`);
        continue;
      }
      if(existing&&sameArticle(existing,input)){
        unchanged++;
        console.log(`[editorial-sync] unchanged ${input.locale}/${input.slug}`);
        continue;
      }
      if(existing){
        await updateDraft(existing,input);
        updated++;
        console.log(`[editorial-sync] updated draft ${input.locale}/${input.slug}`);
      }else{
        await createDraft(input);
        created++;
        console.log(`[editorial-sync] created draft ${input.locale}/${input.slug}`);
      }
    }
  }
  console.log(`[editorial-sync] complete: ${created} created, ${updated} updated, ${unchanged} unchanged, ${protectedCount} published/archived protected`);
}

async function createDraft(input:BlogPostInput){
  const normalized=normalizeInput(input);
  await database().$transaction(async(tx)=>{
    const created=await tx.blogPost.create({data:{
      ...normalized,
      status:"DRAFT",
      coverImageUrl:normalized.coverImageUrl||null,
      coverImageAlt:normalized.coverImageAlt||null,
      readingMinutes:estimateReadingMinutes(normalized.body),
      createdByUserId:systemActor,
      updatedByUserId:systemActor,
      publishedAt:null,
    }});
    await tx.auditLog.create({data:{
      actorUserId:null,
      action:"BLOG_POST_EDITORIAL_SYNC_CREATED",
      entityType:"BlogPost",
      entityId:created.id,
      after:{locale:created.locale,slug:created.slug,title:created.title,status:created.status,source:"repository-editorial-sync"},
    }});
  });
}

async function updateDraft(existing:{id:string;locale:string;slug:string;title:string;status:string},input:BlogPostInput){
  const normalized=normalizeInput(input);
  await database().$transaction(async(tx)=>{
    const updated=await tx.blogPost.update({where:{id:existing.id},data:{
      ...normalized,
      status:"DRAFT",
      coverImageUrl:normalized.coverImageUrl||null,
      coverImageAlt:normalized.coverImageAlt||null,
      readingMinutes:estimateReadingMinutes(normalized.body),
      updatedByUserId:systemActor,
      publishedAt:null,
    }});
    await tx.auditLog.create({data:{
      actorUserId:null,
      action:"BLOG_POST_EDITORIAL_SYNC_UPDATED",
      entityType:"BlogPost",
      entityId:updated.id,
      before:{locale:existing.locale,slug:existing.slug,title:existing.title,status:existing.status},
      after:{locale:updated.locale,slug:updated.slug,title:updated.title,status:updated.status,source:"repository-editorial-sync"},
    }});
  });
}

async function listJsonFiles(){
  try{
    return (await readdir(editorialDir,{withFileTypes:true}))
      .filter(entry=>entry.isFile()&&entry.name.endsWith(".json")&&!entry.name.startsWith("_"))
      .map(entry=>path.join(editorialDir,entry.name))
      .sort();
  }catch(error){
    if((error as NodeJS.ErrnoException).code==="ENOENT")return [];
    throw error;
  }
}

async function readArticles(file:string):Promise<BlogPostInput[]>{
  const raw=JSON.parse(await readFile(file,"utf8")) as unknown;
  const rows=Array.isArray(raw)?raw:[raw];
  return rows.map((row,index)=>{
    if(!row||typeof row!=="object")throw new Error(`[editorial-sync] invalid ${path.basename(file)} item ${index+1}: expected an object`);
    const parsed=blogPostInputSchema.safeParse({...row,status:"DRAFT"});
    if(!parsed.success){
      const detail=parsed.error.issues.map(issue=>`${issue.path.join(".")||"article"}: ${issue.message}`).join(" | ");
      throw new Error(`[editorial-sync] invalid ${path.basename(file)} item ${index+1}: ${detail}`);
    }
    return parsed.data;
  });
}

function normalizeInput(input:BlogPostInput){
  return {
    ...input,
    title:input.title.trim(),
    excerpt:input.excerpt.trim(),
    body:input.body.trim(),
    seoTitle:input.seoTitle.trim(),
    seoDescription:input.seoDescription.trim(),
    category:input.category.trim(),
    authorName:input.authorName.trim(),
    coverImageUrl:input.coverImageUrl?.trim()??"",
    coverImageAlt:input.coverImageAlt?.trim()??"",
    tags:[...new Set(input.tags.map(tag=>tag.trim()).filter(Boolean))].slice(0,12),
  };
}

function estimateReadingMinutes(body:string){
  const words=body.trim()?body.trim().split(/\s+/).length:0;
  return Math.max(1,Math.ceil(words/220));
}

function sameArticle(existing:{
  locale:string;slug:string;title:string;excerpt:string;body:string;seoTitle:string;seoDescription:string;category:string;tags:string[];coverImageUrl:string|null;coverImageAlt:string|null;featured:boolean;status:string;authorName:string;
},input:BlogPostInput){
  const normalized=normalizeInput(input);
  return existing.locale===normalized.locale
    && existing.slug===normalized.slug
    && existing.title===normalized.title
    && existing.excerpt===normalized.excerpt
    && existing.body===normalized.body
    && existing.seoTitle===normalized.seoTitle
    && existing.seoDescription===normalized.seoDescription
    && existing.category===normalized.category
    && JSON.stringify(existing.tags)===JSON.stringify(normalized.tags)
    && (existing.coverImageUrl??"")===normalized.coverImageUrl
    && (existing.coverImageAlt??"")===normalized.coverImageAlt
    && existing.featured===normalized.featured
    && existing.status==="DRAFT"
    && existing.authorName===normalized.authorName;
}

await main();
