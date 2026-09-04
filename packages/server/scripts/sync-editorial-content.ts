import {readdir,readFile} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";
import {blogPostInputSchema,type BlogPostInput} from "@platform/contracts";
import {database} from "@platform/database";
import {createAdminBlogPost,updateAdminBlogPost} from "../src/blog/service";

const here=path.dirname(fileURLToPath(import.meta.url));
const repoRoot=path.resolve(here,"../../..");
const editorialDir=path.join(repoRoot,"content","editorial");

async function main(){
  const files=await listJsonFiles();
  if(files.length===0){
    console.log("[editorial-sync] no queued editorial JSON files; nothing to sync");
    return;
  }

  const actorUserId=await resolveActorUserId();
  if(!actorUserId){
    console.log("[editorial-sync] PLATFORM_OWNER_USER_ID/PLATFORM_OWNER_EMAIL is not configured; skipping repository editorial sync");
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
        await updateAdminBlogPost(actorUserId,existing.id,input);
        updated++;
        console.log(`[editorial-sync] updated draft ${input.locale}/${input.slug}`);
      }else{
        await createAdminBlogPost(actorUserId,input);
        created++;
        console.log(`[editorial-sync] created draft ${input.locale}/${input.slug}`);
      }
    }
  }
  console.log(`[editorial-sync] complete: ${created} created, ${updated} updated, ${unchanged} unchanged, ${protectedCount} published/archived protected`);
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

async function resolveActorUserId(){
  const configuredId=process.env.PLATFORM_OWNER_USER_ID?.trim();
  if(configuredId)return configuredId;
  const email=process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  if(!email)return null;
  const user=await database().user.findUnique({where:{email},select:{id:true}});
  if(!user)throw new Error(`[editorial-sync] PLATFORM_OWNER_EMAIL does not match a user: ${email}`);
  return user.id;
}

async function readArticles(file:string):Promise<BlogPostInput[]>{
  const raw=JSON.parse(await readFile(file,"utf8")) as unknown;
  const rows=Array.isArray(raw)?raw:[raw];
  return rows.map((row,index)=>{
    if(!row||typeof row!=="object")throw new Error(`[editorial-sync] invalid ${path.basename(file)} item ${index+1}: expected an object`);
    // Repository-driven editorial content is deliberately forced to DRAFT.
    // Publishing remains a conscious action in the HandMeKey admin editor.
    const parsed=blogPostInputSchema.safeParse({...row,status:"DRAFT"});
    if(!parsed.success){
      const detail=parsed.error.issues.map(issue=>`${issue.path.join(".")||"article"}: ${issue.message}`).join(" | ");
      throw new Error(`[editorial-sync] invalid ${path.basename(file)} item ${index+1}: ${detail}`);
    }
    return parsed.data;
  });
}

function sameArticle(existing:{
  locale:string;slug:string;title:string;excerpt:string;body:string;seoTitle:string;seoDescription:string;category:string;tags:string[];coverImageUrl:string|null;coverImageAlt:string|null;featured:boolean;status:string;authorName:string;
},input:BlogPostInput){
  return existing.locale===input.locale
    && existing.slug===input.slug
    && existing.title===input.title.trim()
    && existing.excerpt===input.excerpt.trim()
    && existing.body===input.body.trim()
    && existing.seoTitle===input.seoTitle.trim()
    && existing.seoDescription===input.seoDescription.trim()
    && existing.category===input.category.trim()
    && JSON.stringify(existing.tags)===JSON.stringify([...new Set(input.tags.map(tag=>tag.trim()).filter(Boolean))].slice(0,12))
    && (existing.coverImageUrl??"")===(input.coverImageUrl?.trim()??"")
    && (existing.coverImageAlt??"")===(input.coverImageAlt?.trim()??"")
    && existing.featured===input.featured
    && existing.status==="DRAFT"
    && existing.authorName===input.authorName.trim();
}

await main();
