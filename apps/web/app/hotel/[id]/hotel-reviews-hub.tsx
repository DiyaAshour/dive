"use client";

import { ChevronRight, MessageSquareText, ShieldCheck, Star, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { guestDictionary } from "@/lib/guest-i18n";
import type { GuestLocale } from "@/lib/guest-market";

type ReviewSummary = Readonly<{
  count: number;
  overall: number | null;
  cleanliness: number | null;
  staff: number | null;
  location: number | null;
  facilities: number | null;
  comfort: number | null;
  value: number | null;
}>;

type ReviewItem = Readonly<{
  id: string;
  overall: number;
  cleanliness: number;
  staff: number;
  location: number;
  facilities: number;
  comfort: number;
  value: number;
  title: string | null;
  comment: string;
  hotelReply: string | null;
  guestName: string;
  stayCompleted: string;
}>;

type ReviewData = Readonly<{summary: ReviewSummary; reviews: ReviewItem[]}>;
type ExtraCopy = Readonly<{
  kicker:string; title:string; waiting:string; pending:string; open:string; close:string;
  dialogBody:string; pendingBody:string; integrity:string; reviewsKicker:string; reviewsTitle:string;
}>;

const EXTRA: Record<GuestLocale,ExtraCopy> = {
  en:{kicker:"Verified-stay ratings",title:"Guest reviews",waiting:"Waiting for the first verified review",pending:"Pending",open:"View reviews",close:"Close reviews",dialogBody:"Every score and review shown here comes from a guest who completed their stay.",pendingBody:"This property has not received a verified review yet. The score and full review details will appear automatically after the first completed-stay review.",integrity:"No demo scores or reviews without a completed stay are shown.",reviewsKicker:"Guest voice",reviewsTitle:"Verified reviews"},
  ar:{kicker:"تقييمات من إقامات موثقة",title:"تقييمات الضيوف",waiting:"بانتظار أول تقييم موثق",pending:"قيد التقييم",open:"عرض التقييمات",close:"إغلاق التقييمات",dialogBody:"كل الدرجات والمراجعات هنا تأتي من ضيوف أكملوا إقاماتهم.",pendingBody:"لم يصل تقييم موثق لهذا الفندق بعد. عند وصول أول مراجعة من إقامة مكتملة ستظهر الدرجة والتفاصيل تلقائيًا.",integrity:"لا نعرض درجات تجريبية أو تقييمات غير مرتبطة بإقامة مكتملة.",reviewsKicker:"آراء الضيوف",reviewsTitle:"المراجعات الموثقة"},
  zh:{kicker:"真实入住评分",title:"住客评价",waiting:"等待首条验证评价",pending:"待评分",open:"查看评价",close:"关闭评价",dialogBody:"这里的所有评分和评价都来自已完成入住的真实住客。",pendingBody:"此住宿尚未收到验证评价。首位完成入住的住客发布评价后，评分和详情会自动显示。",integrity:"不展示演示评分或未完成入住的评价。",reviewsKicker:"住客反馈",reviewsTitle:"验证评价"},
  fr:{kicker:"Notes de séjours vérifiés",title:"Avis clients",waiting:"En attente du premier avis vérifié",pending:"En attente",open:"Voir les avis",close:"Fermer les avis",dialogBody:"Chaque note et avis affiché ici provient d’un client ayant terminé son séjour.",pendingBody:"Cet établissement n’a pas encore reçu d’avis vérifié. La note et les détails apparaîtront automatiquement après le premier avis d’un séjour terminé.",integrity:"Aucune note de démonstration ni avis sans séjour terminé n’est affiché.",reviewsKicker:"Parole aux clients",reviewsTitle:"Avis vérifiés"},
  de:{kicker:"Bewertungen aus geprüften Aufenthalten",title:"Gästebewertungen",waiting:"Warten auf die erste geprüfte Bewertung",pending:"Ausstehend",open:"Bewertungen ansehen",close:"Bewertungen schließen",dialogBody:"Alle hier gezeigten Bewertungen stammen von Gästen mit abgeschlossenem Aufenthalt.",pendingBody:"Diese Unterkunft hat noch keine geprüfte Bewertung erhalten. Nach der ersten Bewertung eines abgeschlossenen Aufenthalts erscheinen Punktzahl und Details automatisch.",integrity:"Keine Demo-Bewertungen und keine Bewertungen ohne abgeschlossenen Aufenthalt.",reviewsKicker:"Gästestimmen",reviewsTitle:"Geprüfte Bewertungen"},
  es:{kicker:"Valoraciones de estancias verificadas",title:"Opiniones de huéspedes",waiting:"Esperando la primera opinión verificada",pending:"Pendiente",open:"Ver opiniones",close:"Cerrar opiniones",dialogBody:"Todas las puntuaciones y opiniones mostradas proceden de huéspedes que completaron su estancia.",pendingBody:"Este alojamiento aún no ha recibido una opinión verificada. La puntuación y los detalles aparecerán automáticamente tras la primera opinión de una estancia completada.",integrity:"No mostramos puntuaciones de demostración ni opiniones sin una estancia completada.",reviewsKicker:"La voz del huésped",reviewsTitle:"Opiniones verificadas"},
  it:{kicker:"Valutazioni da soggiorni verificati",title:"Recensioni degli ospiti",waiting:"In attesa della prima recensione verificata",pending:"In attesa",open:"Vedi recensioni",close:"Chiudi recensioni",dialogBody:"Ogni punteggio e recensione mostrati qui provengono da ospiti che hanno completato il soggiorno.",pendingBody:"Questa struttura non ha ancora ricevuto recensioni verificate. Il punteggio e i dettagli compariranno automaticamente dopo la prima recensione di un soggiorno completato.",integrity:"Non mostriamo punteggi demo o recensioni senza soggiorno completato.",reviewsKicker:"Voce degli ospiti",reviewsTitle:"Recensioni verificate"},
  tr:{kicker:"Doğrulanmış konaklama puanları",title:"Misafir değerlendirmeleri",waiting:"İlk doğrulanmış yorum bekleniyor",pending:"Değerlendiriliyor",open:"Yorumları gör",close:"Yorumları kapat",dialogBody:"Buradaki tüm puan ve yorumlar konaklamasını tamamlayan misafirlerden gelir.",pendingBody:"Bu tesis henüz doğrulanmış bir yorum almadı. İlk tamamlanmış konaklama yorumu geldiğinde puan ve ayrıntılar otomatik görünecek.",integrity:"Demo puanları veya tamamlanmamış konaklamalara ait yorumlar gösterilmez.",reviewsKicker:"Misafirlerin sesi",reviewsTitle:"Doğrulanmış yorumlar"},
  ru:{kicker:"Оценки подтверждённых проживаний",title:"Отзывы гостей",waiting:"Ожидаем первый проверенный отзыв",pending:"Ожидается",open:"Смотреть отзывы",close:"Закрыть отзывы",dialogBody:"Все оценки и отзывы здесь оставлены гостями после завершённого проживания.",pendingBody:"У этого объекта пока нет проверенных отзывов. Оценка и подробности появятся автоматически после первого отзыва о завершённом проживании.",integrity:"Мы не показываем демо-оценки или отзывы без завершённого проживания.",reviewsKicker:"Мнение гостей",reviewsTitle:"Проверенные отзывы"},
  ja:{kicker:"確認済み宿泊の評価",title:"ゲストレビュー",waiting:"最初の確認済みレビューを待っています",pending:"評価待ち",open:"レビューを見る",close:"レビューを閉じる",dialogBody:"ここに表示される評価とレビューは、宿泊を完了したゲストによるものです。",pendingBody:"この施設にはまだ確認済みレビューがありません。最初の宿泊完了レビューが投稿されると、評価と詳細が自動表示されます。",integrity:"デモ評価や宿泊未完了のレビューは表示しません。",reviewsKicker:"ゲストの声",reviewsTitle:"確認済みレビュー"},
  ko:{kicker:"검증된 숙박 평점",title:"투숙객 후기",waiting:"첫 검증 후기를 기다리는 중",pending:"평가 대기",open:"후기 보기",close:"후기 닫기",dialogBody:"여기에 표시되는 모든 평점과 후기는 숙박을 완료한 투숙객이 작성했습니다.",pendingBody:"아직 검증된 후기가 없습니다. 첫 숙박 완료 후기가 등록되면 평점과 상세 내용이 자동으로 표시됩니다.",integrity:"데모 평점이나 숙박을 완료하지 않은 후기는 표시하지 않습니다.",reviewsKicker:"투숙객 의견",reviewsTitle:"검증된 후기"},
  hi:{kicker:"सत्यापित ठहराव रेटिंग",title:"मेहमान समीक्षाएँ",waiting:"पहली सत्यापित समीक्षा की प्रतीक्षा",pending:"रेटिंग लंबित",open:"समीक्षाएँ देखें",close:"समीक्षाएँ बंद करें",dialogBody:"यहाँ दिखने वाला हर स्कोर और समीक्षा उन मेहमानों से आता है जिन्होंने अपना ठहराव पूरा किया है।",pendingBody:"इस प्रॉपर्टी को अभी सत्यापित समीक्षा नहीं मिली है। पहली पूरी हुई ठहराव समीक्षा के बाद स्कोर और विवरण स्वतः दिखाई देंगे।",integrity:"डेमो स्कोर या अधूरे ठहराव की समीक्षाएँ नहीं दिखाई जातीं।",reviewsKicker:"मेहमानों की राय",reviewsTitle:"सत्यापित समीक्षाएँ"},
  pt:{kicker:"Notas de estadias verificadas",title:"Avaliações de hóspedes",waiting:"Aguardando a primeira avaliação verificada",pending:"Pendente",open:"Ver avaliações",close:"Fechar avaliações",dialogBody:"Todas as notas e avaliações mostradas aqui vêm de hóspedes que concluíram a estadia.",pendingBody:"Esta propriedade ainda não recebeu uma avaliação verificada. A nota e os detalhes aparecerão automaticamente após a primeira avaliação de uma estadia concluída.",integrity:"Não exibimos notas de demonstração nem avaliações sem estadia concluída.",reviewsKicker:"Voz dos hóspedes",reviewsTitle:"Avaliações verificadas"},
  id:{kicker:"Penilaian dari penginapan terverifikasi",title:"Ulasan tamu",waiting:"Menunggu ulasan terverifikasi pertama",pending:"Menunggu penilaian",open:"Lihat ulasan",close:"Tutup ulasan",dialogBody:"Semua nilai dan ulasan di sini berasal dari tamu yang telah menyelesaikan penginapan.",pendingBody:"Properti ini belum menerima ulasan terverifikasi. Nilai dan detail akan muncul otomatis setelah ulasan pertama dari penginapan yang selesai.",integrity:"Kami tidak menampilkan nilai demo atau ulasan tanpa penginapan yang selesai.",reviewsKicker:"Suara tamu",reviewsTitle:"Ulasan terverifikasi"},
  th:{kicker:"คะแนนจากการเข้าพักที่ตรวจสอบแล้ว",title:"รีวิวจากผู้เข้าพัก",waiting:"รอรีวิวที่ตรวจสอบแล้วรายการแรก",pending:"รอคะแนน",open:"ดูรีวิว",close:"ปิดรีวิว",dialogBody:"คะแนนและรีวิวทั้งหมดที่แสดงมาจากผู้เข้าพักที่เข้าพักเสร็จแล้ว",pendingBody:"ที่พักนี้ยังไม่มีรีวิวที่ตรวจสอบแล้ว เมื่อมีรีวิวแรกจากการเข้าพักที่เสร็จสมบูรณ์ คะแนนและรายละเอียดจะแสดงอัตโนมัติ",integrity:"เราไม่แสดงคะแนนสาธิตหรือรีวิวที่ไม่ได้มาจากการเข้าพักที่เสร็จสมบูรณ์",reviewsKicker:"เสียงจากผู้เข้าพัก",reviewsTitle:"รีวิวที่ตรวจสอบแล้ว"},
};

const RATING_LABELS: Record<GuestLocale,readonly [string,string,string,string,string]> = {
  en:["Exceptional","Excellent","Very good","Good","Fair"], ar:["استثنائي","رائع","جيد جدًا","جيد","مقبول"], zh:["超赞","很棒","非常好","好","尚可"], fr:["Exceptionnel","Excellent","Très bien","Bien","Correct"], de:["Außergewöhnlich","Hervorragend","Sehr gut","Gut","Ordentlich"], es:["Excepcional","Excelente","Muy bien","Bien","Aceptable"], it:["Eccezionale","Eccellente","Ottimo","Buono","Discreto"], tr:["Olağanüstü","Mükemmel","Çok iyi","İyi","Yeterli"], ru:["Великолепно","Отлично","Очень хорошо","Хорошо","Нормально"], ja:["最高","とても素晴らしい","とても良い","良い","まずまず"], ko:["최고예요","훌륭해요","매우 좋아요","좋아요","보통이에요"], hi:["असाधारण","उत्कृष्ट","बहुत अच्छा","अच्छा","ठीक"], pt:["Excepcional","Excelente","Muito bom","Bom","Razoável"], id:["Luar biasa","Sangat baik","Baik sekali","Baik","Cukup"], th:["ยอดเยี่ยมเป็นพิเศษ","ยอดเยี่ยม","ดีมาก","ดี","พอใช้"],
};

export function HotelReviewsHub({reviews,locale}:{reviews:ReviewData;locale:GuestLocale}) {
  const copy=reviewCopy(locale);
  const [open,setOpen]=useState(false);
  const closeRef=useRef<HTMLButtonElement>(null);
  const titleId=useId();
  const count=reviews.summary.count;
  const hasReviews=count>0&&reviews.summary.overall!==null;
  const categories=[
    {label:copy.cleanliness,value:reviews.summary.cleanliness},
    {label:copy.staff,value:reviews.summary.staff},
    {label:copy.location,value:reviews.summary.location},
    {label:copy.facilities,value:reviews.summary.facilities},
    {label:copy.comfort,value:reviews.summary.comfort},
    {label:copy.value,value:reviews.summary.value},
  ];

  useEffect(()=>{
    if(!open)return;
    const previous=document.documentElement.style.overflow;
    document.documentElement.style.overflow="hidden";
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
    window.addEventListener("keydown",onKeyDown);
    window.setTimeout(()=>closeRef.current?.focus(),0);
    return ()=>{document.documentElement.style.overflow=previous;window.removeEventListener("keydown",onKeyDown);};
  },[open]);

  const score=reviews.summary.overall;
  return <section className={`hotelReviewsHub reviewsSection ${hasReviews?"hasReviews":"isPending"}`} aria-label={copy.title}>
    <button className="hotelReviewsSummaryButton" type="button" onClick={()=>setOpen(true)} aria-haspopup="dialog">
      <span className="hotelReviewsSummaryIcon"><MessageSquareText size={22}/></span>
      <span className="hotelReviewsSummaryCopy"><small>{copy.kicker}</small><strong>{copy.title}</strong><em>{hasReviews?copy.count(count):copy.waiting}</em></span>
      <span className="hotelReviewsSummaryScore"><b>{score?.toFixed(1)??"—"}</b><span>{hasReviews?ratingLabel(score!,locale):copy.pending}</span><small>{copy.outOf10}</small></span>
      <span className="hotelReviewsOpenCue"><span>{copy.open}</span><ChevronRight size={18}/></span>
    </button>

    {open&&typeof document!=="undefined"&&createPortal(
      <div className="hotelReviewsModalBackdrop" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setOpen(false);}}>
        <section className="hotelReviewsModal" role="dialog" aria-modal="true" aria-labelledby={titleId} dir={locale==="ar"?"rtl":"ltr"}>
          <header className="hotelReviewsModalHeader">
            <div><span>{copy.kicker}</span><h2 id={titleId}>{copy.title}</h2><p>{copy.dialogBody}</p></div>
            <button ref={closeRef} type="button" onClick={()=>setOpen(false)} aria-label={copy.close}><X size={21}/></button>
          </header>
          <div className="hotelReviewsModalBody">
            {!hasReviews?<div className="hotelReviewsPendingState"><span><ShieldCheck size={34}/></span><h3>{copy.pending}</h3><p>{copy.pendingBody}</p><small>{copy.integrity}</small></div>:<>
              <section className="hotelReviewsScorePanel">
                <div className="hotelReviewsOverall"><strong>{score?.toFixed(1)}</strong><span>{ratingLabel(score!,locale)}</span><small>{copy.outOf10} · {copy.count(count)}</small></div>
                <div className="hotelReviewsCategoryGrid">{categories.map((item)=><div className="hotelReviewsCategory" key={item.label}><div><span>{item.label}</span><strong>{item.value?.toFixed(1)??"—"}</strong></div><div><i style={{width:item.value===null?"0%":`${Math.max(0,Math.min(100,item.value*10))}%`}}/></div></div>)}</div>
              </section>
              <section className="hotelReviewsListSection">
                <div className="hotelReviewsListHead"><div><span>{copy.reviewsKicker}</span><h3>{copy.reviewsTitle}</h3></div><strong>{copy.count(count)}</strong></div>
                <div className="hotelReviewsList">{reviews.reviews.map((review)=><article key={review.id}>
                  <div className="hotelReviewCardHead"><span className="hotelReviewScore"><Star size={13} fill="currentColor"/>{review.overall}/10</span><div><strong>{review.guestName}</strong><small><ShieldCheck size={12}/>{copy.verifiedStay} · {review.stayCompleted}</small></div></div>
                  {review.title&&<h4>{review.title}</h4>}
                  <p>{review.comment}</p>
                  {review.hotelReply&&<div className="hotelReviewReply"><strong>{copy.propertyReply}</strong><p>{review.hotelReply}</p></div>}
                </article>)}</div>
              </section>
            </>}
          </div>
        </section>
      </div>,document.body)}
  </section>;
}

function ratingLabel(score:number,locale:GuestLocale):string {
  const labels=RATING_LABELS[locale];
  if(score>=9)return labels[0];
  if(score>=8)return labels[1];
  if(score>=7)return labels[2];
  if(score>=6)return labels[3];
  return labels[4];
}

function reviewCopy(locale:GuestLocale) {
  const common=guestDictionary(locale).hotel;
  const extra=EXTRA[locale];
  return {
    ...extra,
    outOf10:common.outOf10,
    cleanliness:common.cleanliness,
    staff:common.staff,
    location:common.location,
    facilities:common.facilities,
    comfort:common.comfort,
    value:common.value,
    verifiedStay:common.verifiedStay,
    propertyReply:common.propertyResponse,
    count:(value:number)=>reviewCount(locale,value),
  };
}

function reviewCount(locale:GuestLocale,value:number):string {
  if(locale==="ar") return value===1?"تقييم موثق واحد":`${value} تقييمات موثقة`;
  if(locale==="zh") return `${value} 条验证评价`;
  if(locale==="fr") return `${value} avis vérifié${value===1?"":"s"}`;
  if(locale==="de") return `${value} geprüfte Bewertung${value===1?"":"en"}`;
  if(locale==="es") return `${value} ${value===1?"opinión verificada":"opiniones verificadas"}`;
  if(locale==="it") return `${value} ${value===1?"recensione verificata":"recensioni verificate"}`;
  if(locale==="tr") return `${value} doğrulanmış yorum`;
  if(locale==="ru") return `${value} проверенных отзывов`;
  if(locale==="ja") return `確認済みレビュー ${value}件`;
  if(locale==="ko") return `검증된 후기 ${value}개`;
  if(locale==="hi") return `${value} सत्यापित समीक्षाएँ`;
  if(locale==="pt") return `${value} ${value===1?"avaliação verificada":"avaliações verificadas"}`;
  if(locale==="id") return `${value} ulasan terverifikasi`;
  if(locale==="th") return `${value} รีวิวที่ตรวจสอบแล้ว`;
  return `${value} verified ${value===1?"review":"reviews"}`;
}
