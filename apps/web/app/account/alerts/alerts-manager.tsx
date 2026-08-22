"use client";

import Link from "next/link";
import { useState } from "react";

type SearchItem={id:string;name:string;destination:string;arrival:string;departure:string;adults:number;children:number;filters:unknown;createdAt:string;updatedAt:string};
type WatchItem={id:string;hotelId:string;hotelName:string;arrival:string;departure:string;adults:number;children:number;currency:string;baselineTotal:number;lastSeenTotal:number;lowestSeenTotal:number;targetTotal:number|null;lastCheckedAt:string|null;triggeredAt:string|null;createdAt:string;updatedAt:string};
type NotificationItem={id:string;kind:string;title:string;body:string;link:string|null;readAt:string|null;createdAt:string};

export function AlertsManager({initialSearches,initialWatches,initialNotifications}:{initialSearches:SearchItem[];initialWatches:WatchItem[];initialNotifications:NotificationItem[]}){
  const [searches,setSearches]=useState(initialSearches);
  const [watches,setWatches]=useState(initialWatches);
  const [notifications,setNotifications]=useState(initialNotifications);
  const [message,setMessage]=useState<string|null>(null);

  async function removeSearch(id:string){await action(`/api/v1/saved-searches/${id}`,{method:"DELETE"});setSearches((items)=>items.filter((item)=>item.id!==id));setMessage("Saved search removed.");}
  async function removeWatch(id:string){await action(`/api/v1/price-watches/${id}`,{method:"DELETE"});setWatches((items)=>items.filter((item)=>item.id!==id));setMessage("Price watch stopped.");}
  async function markRead(id:string){await action(`/api/v1/notifications/${id}/read`,{method:"POST"});setNotifications((items)=>items.map((item)=>item.id===id?{...item,readAt:new Date().toISOString()}:item));}

  return <div className="stackForm">
    {message&&<div className="setupMessage">{message}</div>}
    <section className="panel"><span className="eyebrow">Price intelligence</span><h2>Active price watches</h2>{watches.length===0?<p className="muted">No active price watches yet. Open a hotel stay and choose “Watch this price”.</p>:<div className="grid2">{watches.map((watch)=><article className="alertCard" key={watch.id}><div style={{width:"100%"}}><strong>{watch.hotelName}</strong><p className="muted">{watch.arrival} → {watch.departure} · {watch.adults} adult{watch.adults===1?"":"s"}{watch.children?` · ${watch.children} children`:""}</p><div className="kpiGrid" style={{gridTemplateColumns:"repeat(3,minmax(0,1fr))"}}><div className="kpi"><span>Started</span><strong>{money(watch.baselineTotal,watch.currency)}</strong></div><div className="kpi"><span>Current</span><strong>{money(watch.lastSeenTotal,watch.currency)}</strong></div><div className="kpi"><span>Lowest</span><strong>{money(watch.lowestSeenTotal,watch.currency)}</strong></div></div>{watch.targetTotal!==null&&<p className={watch.lastSeenTotal<=watch.targetTotal?"status":"muted"}>Target: {money(watch.targetTotal,watch.currency)}{watch.lastSeenTotal<=watch.targetTotal?" · reached":""}</p>}<div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Link prefetch={false} className="secondaryButton" href={hotelLink(watch)}>Open stay</Link><button className="secondaryButton" type="button" onClick={()=>removeWatch(watch.id)}>Stop watch</button></div></div></article>)}</div>}</section>
    <section className="panel"><span className="eyebrow">Notifications</span><h2>Price alerts</h2>{notifications.length===0?<p className="muted">No price alerts yet.</p>:notifications.map((item)=><article className="alertCard" key={item.id} style={{opacity:item.readAt?0.72:1}}><div style={{flex:1}}><strong>{item.title}</strong><p>{item.body}</p><small className="muted">{new Date(item.createdAt).toLocaleString()}</small></div><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>{item.link&&<Link prefetch={false} href={item.link} className="secondaryButton">Open</Link>}{!item.readAt&&<button type="button" className="secondaryButton" onClick={()=>markRead(item.id)}>Mark read</button>}</div></article>)}</section>
    <section className="panel"><span className="eyebrow">Saved discovery</span><h2>Saved searches</h2>{searches.length===0?<p className="muted">No saved searches yet.</p>:<div className="grid2">{searches.map((search)=><article className="alertCard" key={search.id}><div style={{flex:1}}><strong>{search.name}</strong><p className="muted">{search.destination} · {search.arrival} → {search.departure} · {search.adults} adult{search.adults===1?"":"s"}</p><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Link prefetch={false} className="secondaryButton" href={searchLink(search)}>Run search</Link><button className="secondaryButton" type="button" onClick={()=>removeSearch(search.id)}>Remove</button></div></div></article>)}</div>}</section>
  </div>;
}

async function action(url:string,init:RequestInit){const response=await fetch(url,init);const body=await response.json().catch(()=>null);if(!response.ok||body?.error)throw new Error(body?.error?.message||"Request failed");return body.data;}
function money(value:number,currency:string){return `${value.toFixed(2)} ${currency}`;}
function hotelLink(watch:WatchItem){const query=new URLSearchParams({arrival:watch.arrival,departure:watch.departure,adults:String(watch.adults),children:String(watch.children)});return `/hotel/${watch.hotelId}?${query.toString()}`;}
function searchLink(search:SearchItem){const filters=(search.filters&&typeof search.filters==="object"&&!Array.isArray(search.filters)?search.filters:{}) as Record<string,unknown>;const query=new URLSearchParams({destination:search.destination,arrival:search.arrival,departure:search.departure,adults:String(search.adults),children:String(search.children)});for(const star of array(filters.stars))query.append("stars",String(star));for(const amenity of array(filters.amenities))query.append("amenities",String(amenity));if(filters.minPrice!=null)query.set("minPrice",String(filters.minPrice));if(filters.maxPrice!=null)query.set("maxPrice",String(filters.maxPrice));if(filters.freeCancellation===true)query.set("freeCancellation","true");if(typeof filters.paymentMode==="string")query.set("paymentMode",filters.paymentMode);if(typeof filters.sort==="string")query.set("sort",filters.sort);return `/search?${query.toString()}`;}
function array(value:unknown):unknown[]{return Array.isArray(value)?value:[];}
