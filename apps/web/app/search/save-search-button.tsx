"use client";

import { useState } from "react";

type Props = {
  destination:string;
  arrival:string;
  departure:string;
  adults:number;
  children:number;
  filters:Record<string,unknown>;
};

export function SaveSearchButton(props:Props) {
  const [state,setState]=useState<"idle"|"saving"|"saved">("idle");
  const [message,setMessage]=useState<string|null>(null);

  async function save() {
    setState("saving");setMessage(null);
    try {
      const response=await fetch("/api/v1/saved-searches",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...props,name:`${props.destination} stay`})});
      const payload=await response.json().catch(()=>null);
      if(!response.ok||payload?.error)throw new Error(payload?.error?.message||"Unable to save search");
      setState("saved");setMessage("Search saved to your alerts center.");
    } catch(error){setState("idle");setMessage(error instanceof Error?error.message:"Unable to save search");}
  }

  return <div style={{textAlign:"right"}}><button className="secondaryButton" type="button" onClick={save} disabled={state!=="idle"}>{state==="saving"?"Saving…":state==="saved"?"Saved":"Save this search"}</button>{message&&<small className={state==="saved"?"status":"danger"} style={{display:"block",marginTop:6}}>{message}</small>}</div>;
}
