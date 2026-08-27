"use client";

import {useMemo,useState,type DragEvent} from "react";
import {useRouter} from "next/navigation";
import {FolderOpen, GripVertical, Pencil, Plus, Save, Undo2} from "lucide-react";
import type {Locale} from "@/lib/i18n";

export type BlogTaxonomyEditorNode={id:string;name:string;slug:string;parentId:string|null;sortOrder:number};
type MaterializedNode=BlogTaxonomyEditorNode&{path:string;depth:number};

export function BlogTaxonomyManager({locale,initial,counts}:{locale:Locale;initial:BlogTaxonomyEditorNode[];counts:Record<string,number>}){
  const ar=locale==="ar";
  const router=useRouter();
  const [nodes,setNodes]=useState(initial);
  const [saved,setSaved]=useState(initial);
  const [dragId,setDragId]=useState<string|null>(null);
  const [newName,setNewName]=useState("");
  const [newParentId,setNewParentId]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<{tone:"success"|"error";text:string}|null>(null);
  const items=useMemo(()=>materialize(nodes),[nodes]);
  const dirty=JSON.stringify(nodes)!==JSON.stringify(saved);
  const databaseLocale=locale==="ar"?"AR":"EN";

  function orderedChildren(parentId:string|null){return nodes.filter(node=>node.parentId===parentId).sort((a,b)=>a.sortOrder-b.sortOrder||a.name.localeCompare(b.name));}

  function addCategory(){
    const name=newName.trim().replace(/\s+/g," ");
    if(name.length<2){setMessage({tone:"error",text:ar?"اكتب اسم التصنيف أولًا.":"Enter a category name first."});return;}
    const id=crypto.randomUUID();
    const parentId=newParentId||null;
    const siblingCount=nodes.filter(node=>node.parentId===parentId).length;
    const next=[...nodes,{id,name,slug:slugify(name),parentId,sortOrder:siblingCount}];
    if(!isValidDepth(next)){setMessage({tone:"error",text:ar?"وصلت للحد الأقصى من مستويات التصنيفات.":"The maximum category nesting depth has been reached."});return;}
    setNodes(next);setNewName("");setMessage(null);
  }

  function renameCategory(id:string){
    const node=nodes.find(item=>item.id===id); if(!node)return;
    const nextName=window.prompt(ar?"اسم التصنيف الجديد":"New category name",node.name)?.trim().replace(/\s+/g," ");
    if(!nextName||nextName===node.name)return;
    setNodes(current=>current.map(item=>item.id===id?{...item,name:nextName,slug:slugify(nextName)}:item));
  }

  function moveNode(id:string,parentId:string|null,beforeId:string|null){
    const dragged=nodes.find(node=>node.id===id); if(!dragged)return;
    if(parentId===id||isInsideSubtree(parentId,id,nodes)){setMessage({tone:"error",text:ar?"لا يمكن وضع التصنيف داخل أحد فروعه.":"A category cannot be moved inside its own branch."});return;}
    let next=nodes.map(node=>node.id===id?{...node,parentId}:node);
    const targetSiblings=next.filter(node=>node.parentId===parentId&&node.id!==id).sort((a,b)=>a.sortOrder-b.sortOrder);
    const insertAt=beforeId?Math.max(0,targetSiblings.findIndex(node=>node.id===beforeId)):targetSiblings.length;
    const ordered=[...targetSiblings]; ordered.splice(insertAt,0,{...dragged,parentId});
    const targetOrder=new Map(ordered.map((node,index)=>[node.id,index]));
    next=next.map(node=>node.parentId===parentId&&targetOrder.has(node.id)?{...node,sortOrder:targetOrder.get(node.id)!}:node);
    if(dragged.parentId!==parentId){
      const oldSiblings=next.filter(node=>node.parentId===dragged.parentId).sort((a,b)=>a.sortOrder-b.sortOrder);
      const oldOrder=new Map(oldSiblings.map((node,index)=>[node.id,index]));
      next=next.map(node=>node.parentId===dragged.parentId&&oldOrder.has(node.id)?{...node,sortOrder:oldOrder.get(node.id)!}:node);
    }
    if(!isValidDepth(next)){setMessage({tone:"error",text:ar?"وصلت للحد الأقصى من مستويات التصنيفات.":"The maximum category nesting depth has been reached."});return;}
    setNodes(next);setMessage(null);
  }

  function onDragStart(event:DragEvent,id:string){setDragId(id);event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",id);}
  function droppedId(event:DragEvent){return dragId||event.dataTransfer.getData("text/plain")||null;}

  async function save(){
    setBusy(true);setMessage(null);
    try{
      const response=await fetch("/api/v1/admin/blog/taxonomy",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({locale:databaseLocale,nodes})});
      const result=await response.json();
      if(response.status===401){window.location.assign(`/admin/login?next=${encodeURIComponent("/admin/blog")}`);return;}
      if(!response.ok)throw new Error(result?.error?.message||"Unable to save category structure");
      const persisted=result.data as BlogTaxonomyEditorNode[];
      setNodes(persisted);setSaved(persisted);setMessage({tone:"success",text:ar?"تم حفظ ترتيب وهيكل التصنيفات.":"Category order and hierarchy saved."});router.refresh();
    }catch(error){setMessage({tone:"error",text:error instanceof Error?error.message:(ar?"تعذر حفظ التصنيفات.":"Unable to save categories.")});}
    finally{setBusy(false);setDragId(null);}
  }

  function renderLevel(parentId:string|null,depth:number){
    const children=orderedChildren(parentId);
    return <div className="taxonomyLevel">
      {children.map(node=>{
        const item=items.find(value=>value.id===node.id);
        return <div key={node.id}>
          <div className="taxonomyDropLine" onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect="move";}} onDrop={event=>{event.preventDefault();const id=droppedId(event);if(id)moveNode(id,parentId,node.id);setDragId(null);}}><span>{ar?"ضع هنا للترتيب":"Drop here to reorder"}</span></div>
          <div className={`taxonomyNode ${dragId?"isDraggingActive":""}`} style={{marginInlineStart:`${depth*22}px`}} draggable onDragStart={event=>onDragStart(event,node.id)} onDragEnd={()=>setDragId(null)} onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect="move";}} onDrop={event=>{event.preventDefault();event.stopPropagation();const id=droppedId(event);if(id&&id!==node.id)moveNode(id,node.id,null);setDragId(null);}}>
            <GripVertical className="taxonomyGrip" size={18}/><span className="taxonomyFolder"><FolderOpen size={16}/></span><div className="taxonomyNodeCopy"><strong>{node.name}</strong><small>{item?.path??node.name}</small></div><span className="taxonomyCount">{counts[item?.path??node.name]??0}</span><button type="button" onClick={()=>{setNewParentId(node.id);setMessage({tone:"success",text:ar?`أي تصنيف جديد سيضاف داخل «${node.name}».`:`New categories will be added inside “${node.name}”.`});}}><Plus size={14}/>{ar?"فرعي":"Child"}</button><button type="button" onClick={()=>renameCategory(node.id)}><Pencil size={14}/>{ar?"تعديل":"Rename"}</button>{dragId&&dragId!==node.id&&<em>{ar?"أفلت هنا ليصبح فرعيًا":"Drop to make child"}</em>}
          </div>
          {renderLevel(node.id,depth+1)}
        </div>;
      })}
      <div className="taxonomyDropLine taxonomyDropEnd" style={{marginInlineStart:`${depth*22}px`}} onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect="move";}} onDrop={event=>{event.preventDefault();const id=droppedId(event);if(id)moveNode(id,parentId,null);setDragId(null);}}><span>{parentId?(ar?"أفلت هنا في نهاية هذا القسم":"Drop at end of this group"):(ar?"أفلت هنا كمستوى رئيسي":"Drop here as a top-level category")}</span></div>
    </div>;
  }

  return <section className="adminPanel blogTaxonomyManager">
    <div className="blogTaxonomyHead"><div><span className="eyebrow"><FolderOpen size={15}/>{ar?"هيكل المحتوى":"Content taxonomy"}</span><h2>{ar?"رتّب التصنيفات بالسحب والإفلات":"Drag & drop category structure"}</h2><p>{ar?"اسحب على الخط لترتيب التصنيفات، أو أفلت فوق تصنيف لوضعه بداخله كتصنيف فرعي. نقل التصنيف يحدّث مقالاته تلقائيًا.":"Drop on a line to reorder, or drop on a category to nest it. Moving a category automatically updates its assigned articles."}</p></div><div className="blogTaxonomyActions">{dirty&&<button type="button" className="secondaryButton" onClick={()=>{setNodes(saved);setMessage(null);}}><Undo2 size={15}/>{ar?"تراجع":"Reset"}</button>}<button type="button" className="primaryButton" disabled={!dirty||busy} onClick={()=>void save()}><Save size={15}/>{busy?(ar?"جارٍ الحفظ…":"Saving…"):(ar?"حفظ الترتيب":"Save structure")}</button></div></div>
    {message&&<div className={`blogEditorNotice blogCmsNotice ${message.tone}`}>{message.text}</div>}
    <div className="blogTaxonomyComposer"><input value={newName} onChange={event=>setNewName(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();addCategory();}}} placeholder={ar?"اسم التصنيف الجديد، مثال: فنادق":"New category, e.g. Hotels"}/><select value={newParentId} onChange={event=>setNewParentId(event.target.value)}><option value="">{ar?"تصنيف رئيسي":"Top level"}</option>{items.sort((a,b)=>a.path.localeCompare(b.path)).map(item=><option value={item.id} key={item.id}>{"— ".repeat(item.depth)}{item.name}</option>)}</select><button type="button" className="secondaryButton" onClick={addCategory}><Plus size={15}/>{ar?"إضافة":"Add"}</button></div>
    <div className="blogTaxonomyTree">{nodes.length?renderLevel(null,0):<div className="blogTaxonomyEmpty"><FolderOpen size={24}/><span>{ar?"ابدأ بإضافة أول تصنيف رئيسي.":"Add your first top-level category."}</span></div>}</div>
  </section>;
}

function materialize(nodes:BlogTaxonomyEditorNode[]):MaterializedNode[]{
  const byId=new Map(nodes.map(node=>[node.id,node]));const memo=new Map<string,{path:string;depth:number}>();
  const resolve=(node:BlogTaxonomyEditorNode,stack=new Set<string>()):{path:string;depth:number}=>{const cached=memo.get(node.id);if(cached)return cached;if(stack.has(node.id))return {path:node.name,depth:99};const next=new Set(stack);next.add(node.id);if(!node.parentId){const value={path:node.name,depth:0};memo.set(node.id,value);return value;}const parent=byId.get(node.parentId);if(!parent)return {path:node.name,depth:0};const parentValue=resolve(parent,next);const value={path:`${parentValue.path} / ${node.name}`,depth:parentValue.depth+1};memo.set(node.id,value);return value;};
  return nodes.map(node=>({...node,...resolve(node)}));
}
function isInsideSubtree(parentId:string|null,nodeId:string,nodes:BlogTaxonomyEditorNode[]){let current=parentId;const byId=new Map(nodes.map(node=>[node.id,node]));while(current){if(current===nodeId)return true;current=byId.get(current)?.parentId??null;}return false;}
function isValidDepth(nodes:BlogTaxonomyEditorNode[]){return materialize(nodes).every(item=>item.depth<=3);}
function slugify(value:string){return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"").slice(0,80)||"category";}
