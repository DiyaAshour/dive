import { redirect } from "next/navigation";
import { listPriceWatches, listSavedSearches, listUserNotifications } from "@platform/server";
import { AccountShell } from "@/components/account-shell";
import { currentUser } from "@/lib/server-session";
import { AlertsManager } from "./alerts-manager";

export const dynamic = "force-dynamic";

export default async function AlertsPage(){
  const user=await currentUser();
  if(!user)redirect("/login?next=/account/alerts");
  const [searches,watches,notifications]=await Promise.all([listSavedSearches(user.id),listPriceWatches(user.id),listUserNotifications(user.id,100)]);
  return <AccountShell active="alerts" eyebrow="Account intelligence" title="Alerts & watches" description="Saved searches and live price monitoring use the same rates, promotions and availability shown at booking.">
    <AlertsManager initialSearches={searches.map((item)=>({...item,arrival:key(item.arrival),departure:key(item.departure),createdAt:item.createdAt.toISOString(),updatedAt:item.updatedAt.toISOString()}))} initialWatches={watches.map((item)=>({...item,arrival:key(item.arrival),departure:key(item.departure),baselineTotal:Number(item.baselineTotal),lastSeenTotal:Number(item.lastSeenTotal),lowestSeenTotal:Number(item.lowestSeenTotal),targetTotal:item.targetTotal===null?null:Number(item.targetTotal),lastCheckedAt:item.lastCheckedAt?.toISOString()??null,triggeredAt:item.triggeredAt?.toISOString()??null,createdAt:item.createdAt.toISOString(),updatedAt:item.updatedAt.toISOString()}))} initialNotifications={notifications.map((item)=>({...item,readAt:item.readAt?.toISOString()??null,createdAt:item.createdAt.toISOString()}))}/>
  </AccountShell>;
}

function key(date:Date){return date.toISOString().slice(0,10);}
