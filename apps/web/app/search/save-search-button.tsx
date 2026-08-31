"use client";

import { useEffect, useState } from "react";
import { localeFromLanguageTag, type GuestLocale } from "@/lib/guest-market";

type Props = {
  locale:GuestLocale;
  destination:string;
  arrival:string;
  departure:string;
  adults:number;
  children:number;
  filters:Record<string,unknown>;
};

type Copy={name:(destination:string)=>string;save:string;saving:string;saved:string;success:string;error:string};
const COPY:Record<GuestLocale,Copy>={
  en:{name:d=>`${d} stay`,save:"Save this search",saving:"Saving…",saved:"Saved",success:"Search saved to your alerts center.",error:"Unable to save search"},
  ar:{name:d=>`إقامة في ${d}`,save:"حفظ هذا البحث",saving:"جارٍ الحفظ…",saved:"تم الحفظ",success:"تم حفظ البحث في مركز التنبيهات.",error:"تعذر حفظ البحث"},
  zh:{name:d=>`${d}住宿`,save:"保存此搜索",saving:"正在保存…",saved:"已保存",success:"搜索已保存到提醒中心。",error:"无法保存搜索"},
  fr:{name:d=>`Séjour à ${d}`,save:"Enregistrer cette recherche",saving:"Enregistrement…",saved:"Enregistré",success:"Recherche enregistrée dans votre centre d’alertes.",error:"Impossible d’enregistrer la recherche"},
  de:{name:d=>`Aufenthalt in ${d}`,save:"Diese Suche speichern",saving:"Speichern…",saved:"Gespeichert",success:"Suche wurde in Ihrem Benachrichtigungscenter gespeichert.",error:"Suche konnte nicht gespeichert werden"},
  es:{name:d=>`Estancia en ${d}`,save:"Guardar esta búsqueda",saving:"Guardando…",saved:"Guardado",success:"Búsqueda guardada en tu centro de alertas.",error:"No se pudo guardar la búsqueda"},
  it:{name:d=>`Soggiorno a ${d}`,save:"Salva questa ricerca",saving:"Salvataggio…",saved:"Salvato",success:"Ricerca salvata nel centro avvisi.",error:"Impossibile salvare la ricerca"},
  tr:{name:d=>`${d} konaklaması`,save:"Bu aramayı kaydet",saving:"Kaydediliyor…",saved:"Kaydedildi",success:"Arama uyarı merkezinize kaydedildi.",error:"Arama kaydedilemedi"},
  ru:{name:d=>`Проживание: ${d}`,save:"Сохранить поиск",saving:"Сохранение…",saved:"Сохранено",success:"Поиск сохранён в центре уведомлений.",error:"Не удалось сохранить поиск"},
  ja:{name:d=>`${d}の滞在`,save:"この検索を保存",saving:"保存中…",saved:"保存済み",success:"検索を通知センターに保存しました。",error:"検索を保存できませんでした"},
  ko:{name:d=>`${d} 숙박`,save:"이 검색 저장",saving:"저장 중…",saved:"저장됨",success:"검색이 알림 센터에 저장되었습니다.",error:"검색을 저장할 수 없습니다"},
  hi:{name:d=>`${d} में ठहराव`,save:"यह खोज सहेजें",saving:"सहेजा जा रहा है…",saved:"सहेजा गया",success:"खोज आपके अलर्ट केंद्र में सहेजी गई।",error:"खोज सहेजी नहीं जा सकी"},
  pt:{name:d=>`Estadia em ${d}`,save:"Salvar esta pesquisa",saving:"Salvando…",saved:"Salvo",success:"Pesquisa salva na sua central de alertas.",error:"Não foi possível salvar a pesquisa"},
  id:{name:d=>`Menginap di ${d}`,save:"Simpan pencarian ini",saving:"Menyimpan…",saved:"Tersimpan",success:"Pencarian disimpan ke pusat notifikasi Anda.",error:"Tidak dapat menyimpan pencarian"},
  th:{name:d=>`ที่พักใน ${d}`,save:"บันทึกการค้นหานี้",saving:"กำลังบันทึก…",saved:"บันทึกแล้ว",success:"บันทึกการค้นหาไว้ในศูนย์แจ้งเตือนแล้ว",error:"ไม่สามารถบันทึกการค้นหาได้"},
};

export function SaveSearchButton({locale,...search}:Props) {
  const [effectiveLocale,setEffectiveLocale]=useState<GuestLocale>(locale);
  const [state,setState]=useState<"idle"|"saving"|"saved">("idle");
  const [message,setMessage]=useState<string|null>(null);
  const copy=COPY[effectiveLocale];
  const rtl=effectiveLocale==="ar";

  useEffect(()=>{
    const pageLocale=localeFromLanguageTag(document.querySelector<HTMLElement>(".searchExperience")?.getAttribute("lang")||document.documentElement.lang);
    setEffectiveLocale(pageLocale??locale);
  },[locale]);

  async function save() {
    setState("saving");setMessage(null);
    try {
      const response=await fetch("/api/v1/saved-searches",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...search,name:copy.name(search.destination)})});
      const payload=await response.json().catch(()=>null);
      if(!response.ok||payload?.error)throw new Error(payload?.error?.message||copy.error);
      setState("saved");setMessage(copy.success);
    } catch(error){setState("idle");setMessage(error instanceof Error?error.message:copy.error);}
  }

  return <div style={{textAlign:rtl?"left":"right"}}><button className="secondaryButton" type="button" onClick={save} disabled={state!=="idle"}>{state==="saving"?copy.saving:state==="saved"?copy.saved:copy.save}</button>{message&&<small className={state==="saved"?"status":"danger"} style={{display:"block",marginTop:6}}>{message}</small>}</div>;
}
