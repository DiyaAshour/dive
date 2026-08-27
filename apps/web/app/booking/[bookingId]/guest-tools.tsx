"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Ban,
  BedDouble,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Inbox,
  Link2,
  LogIn,
  MessageSquareText,
  Send,
  Star,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { BookingActionCard } from "@/components/booking-action-card";

type StayPhase = "HOLD" | "UPCOMING" | "ARRIVAL_DAY" | "IN_STAY" | "COMPLETED" | "CLOSED";
type Arrival = {expectedArrivalTime:string|null;arrivalStatus:string;status:string};
type GuestRequest = {id:string;category:string;message:string;status:string;createdAt:string};
type BookingMessage = {id:string;senderKind:"GUEST"|"HOTEL";body:string;createdAt:string};
type ReviewEligibility = {eligible:boolean;alreadyReviewed:boolean;departure:string;today:string};
type CancellationPreview = {penaltyAmount:number;refundableAmount:number;alreadyCancelled:boolean}|null;
type BookingMeta = {
  status:string;
  paymentMode:string;
  paymentState:string;
  currency:string;
  stayPhase:StayPhase;
  account:{linked:boolean};
  viewer:{signedIn:boolean};
  cancellation:{current:CancellationPreview};
};
type Props = {bookingId:string;locale:Locale};
type ActionScope = "arrival"|"request"|"message"|"review"|"link"|"cancel";
type NoticeContent = {tone:"success"|"error";text:string};
type Notices = Partial<Record<ActionScope,NoticeContent>>;

const quickArrivalTimes = ["12:00","15:00","18:00","21:00"] as const;

export function GuestTools({bookingId,locale}:Props) {
  const ar=locale==="ar";
  const [arrival,setArrival] = useState<Arrival|null>(null);
  const [arrivalDraft,setArrivalDraft] = useState("");
  const [requests,setRequests] = useState<GuestRequest[]>([]);
  const [requestCategory,setRequestCategory] = useState("OTHER");
  const [requestText,setRequestText] = useState("");
  const [messages,setMessages] = useState<BookingMessage[]>([]);
  const [messageText,setMessageText] = useState("");
  const [reviewEligibility,setReviewEligibility] = useState<ReviewEligibility|null>(null);
  const [bookingMeta,setBookingMeta] = useState<BookingMeta|null>(null);
  const [loadingTools,setLoadingTools] = useState(true);
  const [busyActions,setBusyActions] = useState<Set<ActionScope>>(()=>new Set());
  const [notices,setNotices] = useState<Notices>({});

  useEffect(()=>{
    const headers = accessHeaders(bookingId);
    setLoadingTools(true);
    Promise.all([
      api<Arrival>(`/api/v1/bookings/${bookingId}/arrival`,{headers}),
      api<GuestRequest[]>(`/api/v1/bookings/${bookingId}/requests`,{headers}),
      api<BookingMessage[]>(`/api/v1/bookings/${bookingId}/messages`,{headers}),
      api<ReviewEligibility>(`/api/v1/bookings/${bookingId}/review`,{headers}),
      api<BookingMeta>(`/api/v1/bookings/${bookingId}`,{headers}),
    ]).then(([nextArrival,nextRequests,nextMessages,nextReview,nextBooking])=>{
      setArrival(nextArrival);
      setArrivalDraft(nextArrival.expectedArrivalTime??"");
      setRequests(nextRequests);
      setMessages(nextMessages);
      setReviewEligibility(nextReview);
      setBookingMeta(nextBooking);
    }).catch((error)=>setNotice("arrival","error",error instanceof Error?error.message:(ar?"تعذر تحميل أدوات الحجز":"Unable to load booking tools"))).finally(()=>setLoadingTools(false));
  },[bookingId,ar]);

  const phase = bookingMeta?.stayPhase ?? "UPCOMING";
  const arrivalChanged = arrivalDraft !== (arrival?.expectedArrivalTime??"");
  const arrived = arrival?.arrivalStatus === "ARRIVED";
  const requestValid = requestText.trim().length >= 2;
  const messageValid = messageText.trim().length >= 1;
  const recentRequests = useMemo(()=>requests.slice(-4).reverse(),[requests]);
  const isBusy = (scope:ActionScope)=>busyActions.has(scope);
  const activeStay = phase!=="COMPLETED" && phase!=="CLOSED";
  const showArrival = activeStay && !arrived && (phase==="HOLD" || phase==="UPCOMING" || phase==="ARRIVAL_DAY" || phase==="IN_STAY");
  const showReview = Boolean(reviewEligibility?.eligible || reviewEligibility?.alreadyReviewed);
  const showLink = Boolean(bookingMeta && !bookingMeta.account.linked);
  const currentCancellation = bookingMeta?.cancellation.current ?? null;
  const showCancellation = Boolean(activeStay && !arrived && currentCancellation && !currentCancellation.alreadyCancelled);
  const manageCopy = managementCopy(phase,locale);

  async function saveArrival(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!arrivalChanged||arrived)return;
    begin("arrival");
    try {
      const result=await api<Arrival>(`/api/v1/bookings/${bookingId}/arrival`,{method:"PUT",headers:{...accessHeaders(bookingId),"content-type":"application/json"},body:JSON.stringify({expectedArrivalTime:arrivalDraft||null})});
      setArrival(result);
      setArrivalDraft(result.expectedArrivalTime??"");
      setNotice("arrival","success",ar?"تم حفظ وقت الوصول المتوقع بنجاح.":"Expected arrival time saved.");
    } catch(error){fail("arrival",error,ar?"تعذر تحديث وقت الوصول":"Unable to update arrival");}
    finally{finish("arrival");}
  }

  async function addRequest(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!requestValid)return;
    begin("request");
    try {
      const created=await api<GuestRequest>(`/api/v1/bookings/${bookingId}/requests`,{method:"POST",headers:{...accessHeaders(bookingId),"content-type":"application/json"},body:JSON.stringify({category:requestCategory,message:requestText.trim()})});
      setRequests((current)=>[...current,created]);
      setRequestText("");
      setNotice("request","success",ar?"تم إرسال الطلب إلى الفندق وسيظهر تحديث حالته هنا.":"Request sent to the hotel. Its status will stay visible here.");
    } catch(error){fail("request",error,ar?"تعذر إرسال الطلب":"Unable to send request");}
    finally{finish("request");}
  }

  async function sendMessage(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!messageValid)return;
    begin("message");
    try {
      const created=await api<BookingMessage>(`/api/v1/bookings/${bookingId}/messages`,{method:"POST",headers:{...accessHeaders(bookingId),"content-type":"application/json"},body:JSON.stringify({body:messageText.trim()})});
      setMessages((current)=>[...current,created]);
      setMessageText("");
      setNotice("message","success",ar?"تم إرسال رسالتك إلى الفندق.":"Your message was sent to the hotel.");
    } catch(error){fail("message",error,ar?"تعذر إرسال الرسالة":"Unable to send message");}
    finally{finish("message");}
  }

  async function submitReview(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    begin("review");
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    const score=(name:string)=>Number(form.get(name));
    try {
      await api(`/api/v1/bookings/${bookingId}/review`,{method:"POST",headers:{...accessHeaders(bookingId),"content-type":"application/json"},body:JSON.stringify({overall:score("overall"),cleanliness:score("cleanliness"),staff:score("staff"),location:score("location"),facilities:score("facilities"),comfort:score("comfort"),value:score("value"),title:String(form.get("title")||"")||null,comment:String(form.get("comment"))})});
      setReviewEligibility((current)=>current?{...current,eligible:false,alreadyReviewed:true}:current);
      formElement.reset();
      setNotice("review","success",ar?"شكرًا لك. تم نشر تقييم إقامتك الموثق.":"Thank you. Your verified-stay review is published.");
    } catch(error){fail("review",error,ar?"تعذر إرسال التقييم":"Unable to submit review");}
    finally{finish("review");}
  }

  async function linkAccount() {
    begin("link");
    try {
      await api(`/api/v1/bookings/${bookingId}/link-account`,{method:"POST",headers:accessHeaders(bookingId)});
      setNotice("link","success",ar?"تم ربط الحجز بحسابك وسيظهر الآن ضمن حجوزاتي.":"Booking linked to your account. It will now appear in My Trips.");
      window.setTimeout(()=>setBookingMeta((current)=>current?{...current,account:{linked:true}}:current),450);
    } catch(error){fail("link",error,ar?"تعذر ربط الحجز":"Unable to link booking");}
    finally{finish("link");}
  }

  async function cancelReservation() {
    begin("cancel");
    try {
      const preview=await api<{penaltyAmount:number;refundableAmount:number;alreadyCancelled:boolean}>(`/api/v1/bookings/${bookingId}/cancellation`,{headers:accessHeaders(bookingId)});
      if(preview.alreadyCancelled){setNotice("cancel","success",ar?"هذا الحجز ملغى بالفعل.":"This reservation is already cancelled.");return;}
      const currency=bookingMeta?.currency??"";
      const payAtHotel=bookingMeta?.paymentMode==="PAY_AT_HOTEL";
      const summary=payAtHotel
        ? (ar?`رسوم الإلغاء الحالية: ${money(preview.penaltyAmount,currency)}. هل تريد المتابعة؟`:`Current cancellation penalty: ${money(preview.penaltyAmount,currency)}. Continue?`)
        : (ar?`رسوم الإلغاء: ${money(preview.penaltyAmount,currency)}. المبلغ القابل للاسترداد: ${money(preview.refundableAmount,currency)}. هل تريد المتابعة؟`:`Cancellation penalty: ${money(preview.penaltyAmount,currency)}. Refundable amount: ${money(preview.refundableAmount,currency)}. Continue?`);
      if(!window.confirm(summary))return;
      await api(`/api/v1/bookings/${bookingId}/cancel`,{method:"POST",headers:{...accessHeaders(bookingId),"idempotency-key":crypto.randomUUID()}});
      setNotice("cancel","success",ar?"تم إلغاء الحجز. جارٍ تحديث الحالة…":"Reservation cancelled. Reloading booking status…");
      window.setTimeout(()=>window.location.reload(),500);
    } catch(error){fail("cancel",error,ar?"تعذر إلغاء الحجز":"Unable to cancel reservation");}
    finally{finish("cancel");}
  }

  function begin(scope:ActionScope){setBusyActions((current)=>{const next=new Set(current);next.add(scope);return next;});setNotices((current)=>{const next={...current};delete next[scope];return next;});}
  function finish(scope:ActionScope){setBusyActions((current)=>{const next=new Set(current);next.delete(scope);return next;});}
  function setNotice(scope:ActionScope,tone:NoticeContent["tone"],text:string){setNotices((current)=>({...current,[scope]:{tone,text}}));}
  function fail(scope:ActionScope,error:unknown,fallback:string){setNotice(scope,"error",error instanceof Error?error.message:fallback);}

  const arrivalCard = showArrival ? <div className={`bookingToolSlot ${phase==="ARRIVAL_DAY"?"bookingToolPriority":""}`} id="arrival">
    <BookingActionCard
      icon={Clock3}
      eyebrow={ar?"الوصول":"Arrival"}
      title={phase==="ARRIVAL_DAY"?(ar?"حدد وقت وصولك اليوم":"Set today's arrival time"):(ar?"وقت الوصول المتوقع":"Expected arrival time")}
      description={phase==="ARRIVAL_DAY"?(ar?"ساعد الفندق على الاستعداد قبل وصولك اليوم.":"Help the property prepare before you arrive today."):(ar?"ساعد الفندق على الاستعداد لاستقبالك. يُحفظ الوقت حسب المنطقة الزمنية المحلية للفندق.":"Help the property prepare for your arrival. Time is stored in the hotel's local timezone.")}
      className={phase==="ARRIVAL_DAY"?"bookingActionCardPriority":""}
    >
      <form onSubmit={saveArrival}>
        <label className="bookingField"><span className="bookingFieldLabel">{ar?"وقت الوصول":"Arrival time"}</span><input type="time" value={arrivalDraft} onChange={(event)=>setArrivalDraft(event.target.value)} disabled={arrived||isBusy("arrival")}/></label>
        <div className="bookingQuickTimes" aria-label={ar?"أوقات وصول سريعة":"Quick arrival times"}>{quickArrivalTimes.map((time)=><button className={`bookingQuickTime ${arrivalDraft===time?"active":""}`} type="button" onClick={()=>setArrivalDraft(time)} disabled={arrived||isBusy("arrival")} key={time}>{formatClock(time,locale)}</button>)}</div>
        {arrival?.expectedArrivalTime && <div className="bookingSavedValue"><CheckCircle2 size={15}/><span>{ar?"الوقت المحفوظ:":"Saved arrival:"} <strong>{formatClock(arrival.expectedArrivalTime,locale)}</strong></span></div>}
        <button className="bookingPrimaryAction bookingFullAction" type="submit" disabled={!arrivalChanged||arrived||isBusy("arrival")}>{arrived?(ar?"تم تسجيل وصول الضيف":"Guest marked arrived"):isBusy("arrival")?(ar?"جارٍ الحفظ…":"Saving…"):(ar?"حفظ وقت الوصول":"Save arrival time")}</button>
      </form>
      <InlineNotice notice={notices.arrival}/>
    </BookingActionCard>
  </div> : null;

  const requestsCard = activeStay ? <div className="bookingToolSlot" id="requests">
    <BookingActionCard icon={BedDouble} eyebrow={ar?"طلبات الضيف":"Guest requests"} title={ar?"طلبات للفندق":"Requests for the hotel"} description={ar?"أرسل احتياجًا واضحًا للفندق واحتفظ بحالته مع الحجز.":"Send a clear request to the property and keep its status attached to this stay."}>
      {loadingTools ? <EmptyState text={ar?"جارٍ تحميل طلبات الحجز…":"Loading booking requests…"}/> : recentRequests.length ? <div className="bookingRequestHistory">{recentRequests.map((request)=><article className="bookingRequestItem" key={request.id}><div className="bookingRequestTop"><strong>{categoryLabel(request.category,locale)}</strong><span className={`bookingStatusPill ${request.status.toLowerCase()}`}>{requestStatusLabel(request.status,locale)}</span></div><p>{request.message}</p></article>)}</div> : <EmptyState text={ar?"لا توجد طلبات بعد. يمكنك إرسال أول طلب من النموذج أدناه.":"No requests yet. You can send the first one below."}/>} 
      <form onSubmit={addRequest}>
        <label className="bookingField"><span className="bookingFieldLabel">{ar?"نوع الطلب":"Request type"}</span><select value={requestCategory} onChange={(event)=>setRequestCategory(event.target.value)} disabled={isBusy("request")}><option value="ARRIVAL">{categoryLabel("ARRIVAL",locale)}</option><option value="BEDDING">{categoryLabel("BEDDING",locale)}</option><option value="ACCESSIBILITY">{categoryLabel("ACCESSIBILITY",locale)}</option><option value="TRANSPORT">{categoryLabel("TRANSPORT",locale)}</option><option value="OTHER">{categoryLabel("OTHER",locale)}</option></select></label>
        <label className="bookingField"><span className="bookingFieldLabel">{ar?"تفاصيل الطلب":"Request details"}</span><textarea value={requestText} onChange={(event)=>setRequestText(event.target.value)} maxLength={2000} disabled={isBusy("request")} placeholder={ar?"مثال: أحتاج سريرًا إضافيًا لطفل، إن كان متاحًا.":"Example: I need an extra bed for a child, if available."}/><span className="bookingComposerMeta"><span>{ar?"سيصل الطلب مباشرة ضمن هذا الحجز.":"This request stays attached to the booking."}</span><span>{requestText.length}/2000</span></span></label>
        <button className="bookingPrimaryAction bookingFullAction" disabled={!requestValid||isBusy("request")} type="submit"><Send size={16}/>{isBusy("request")?(ar?"جارٍ الإرسال…":"Sending…"):(ar?"إرسال الطلب":"Send request")}</button>
      </form>
      <InlineNotice notice={notices.request}/>
    </BookingActionCard>
  </div> : null;

  const messagesCard = <div className="bookingToolSlot" id="messages">
    <BookingActionCard icon={MessageSquareText} eyebrow={ar?"الرسائل":"Messages"} title={ar?"راسل الفندق":"Message the hotel"} description={ar?"احتفظ بالمحادثة المتعلقة بالحجز في مكان واحد بدل رسائل منفصلة.":"Keep reservation-specific communication in one thread instead of scattered messages."}>
      {loadingTools ? <EmptyState text={ar?"جارٍ تحميل المحادثة…":"Loading conversation…"}/> : messages.length ? <div className="bookingMessageThread">{messages.map((item)=><article className={`bookingMessageBubble ${item.senderKind==="GUEST"?"mine":"theirs"}`} key={item.id}><div className="bookingMessageMeta"><strong>{item.senderKind==="HOTEL"?(ar?"الفندق":"Hotel"):(ar?"أنت":"You")}</strong><time>{formatMessageTime(item.createdAt,locale)}</time></div><p>{item.body}</p></article>)}</div> : <EmptyState text={ar?"لا توجد رسائل بعد. ابدأ المحادثة بخصوص هذه الإقامة.":"No messages yet. Start the conversation about this stay."}/>} 
      <form onSubmit={sendMessage}>
        <label className="bookingField"><span className="bookingFieldLabel">{ar?"رسالتك":"Your message"}</span><textarea value={messageText} onChange={(event)=>setMessageText(event.target.value)} required maxLength={4000} disabled={isBusy("message")} placeholder={ar?"اكتب رسالتك إلى الفندق…":"Write your message to the hotel…"}/><span className="bookingComposerMeta"><span>{ar?"لا ترسل معلومات دفع أو بيانات حساسة في الرسائل.":"Do not send payment details or sensitive information in messages."}</span><span>{messageText.length}/4000</span></span></label>
        <button className="bookingPrimaryAction bookingFullAction" type="submit" disabled={!messageValid||isBusy("message")}><Send size={16}/>{isBusy("message")?(ar?"جارٍ الإرسال…":"Sending…"):(ar?"إرسال الرسالة":"Send message")}</button>
      </form>
      <InlineNotice notice={notices.message}/>
    </BookingActionCard>
  </div>;

  const reviewCard = showReview ? <div className="bookingToolSlot" id="review">
    <BookingActionCard icon={Star} eyebrow={ar?"تقييم إقامة موثق":"Verified stay review"} title={reviewEligibility?.alreadyReviewed?(ar?"شكرًا على تقييمك":"Thanks for your review"):(ar?"قيّم إقامتك":"Rate your stay")} description={ar?"التقييم مرتبط بحجز مكتمل وموثق.":"Your review remains tied to a completed, verified booking."} className={reviewEligibility?.eligible?"bookingActionCardReview":""}>
      {reviewEligibility?.alreadyReviewed ? <div className="bookingNotice success"><CheckCircle2 size={16}/><span>{ar?"لقد قيّمت هذه الإقامة بالفعل.":"You already reviewed this stay."}</span></div> : reviewEligibility?.eligible ? <form onSubmit={submitReview}>
        <div className="bookingReviewScores">{["overall","cleanliness","staff","location","facilities","comfort","value"].map((field)=><label className="bookingField" key={field}><span className="bookingFieldLabel">{reviewLabel(field,locale)}</span><select name={field} defaultValue="10">{Array.from({length:10},(_,index)=>10-index).map((score)=><option key={score} value={score}>{score}/10</option>)}</select></label>)}</div>
        <label className="bookingField"><span className="bookingFieldLabel">{ar?"عنوان مختصر":"Short title"}</span><input name="title" maxLength={120}/></label>
        <label className="bookingField"><span className="bookingFieldLabel">{ar?"تقييمك":"Your review"}</span><textarea name="comment" minLength={10} maxLength={5000} required placeholder={ar?"شارك ما كان جيدًا وما يمكن تحسينه…":"Share what worked well and what could improve…"}/></label>
        <button className="bookingPrimaryAction bookingFullAction" type="submit" disabled={isBusy("review")}>{isBusy("review")?(ar?"جارٍ النشر…":"Publishing…"):(ar?"نشر التقييم الموثق":"Publish verified review")}</button>
      </form> : null}
      <InlineNotice notice={notices.review}/>
    </BookingActionCard>
  </div> : null;

  const linkCard = showLink ? <div className="bookingToolSlot" id="keep-trip">
    <BookingActionCard icon={Link2} eyebrow={ar?"الحساب":"Account"} title={ar?"احتفظ بهذا الحجز":"Keep this trip"} description={bookingMeta?.viewer.signedIn?(ar?"اربط حجز الضيف بحسابك حتى يظهر ضمن حجوزاتي على كل أجهزتك.":"Link this guest booking to your account so it stays in My Trips across devices."):(ar?"سجّل الدخول أولًا لإضافة هذا الحجز إلى حجوزاتي.":"Sign in first to save this booking to My Trips.")} compact footer={bookingMeta?.viewer.signedIn ? <button className="bookingSecondaryAction" type="button" onClick={()=>void linkAccount()} disabled={isBusy("link")}>{isBusy("link")?(ar?"جارٍ الربط…":"Linking…"):(ar?"إضافة إلى حجوزاتي":"Add to My Trips")}</button> : <a className="bookingSecondaryAction" href={`/login?next=${encodeURIComponent(`/booking/${bookingId}`)}`}><LogIn size={15}/>{ar?"تسجيل الدخول للحفظ":"Sign in to save"}</a>}>
      <p className="bookingCompactCopy">{ar?"الربط لا يغيّر السعر أو شروط الحجز؛ فقط يحفظه داخل حسابك.":"Linking does not change the price or booking terms; it only saves the trip to your account."}</p><InlineNotice notice={notices.link}/>
    </BookingActionCard>
  </div> : null;

  const cancellationCard = showCancellation && currentCancellation ? <div className="bookingToolSlot" id="cancellation">
    <BookingActionCard icon={Ban} eyebrow={ar?"إدارة الحجز":"Booking management"} title={ar?"الإلغاء":"Cancellation"} description={currentCancellation.penaltyAmount<=0?(ar?"الإلغاء متاح حاليًا بدون رسوم.":"Cancellation is currently free."):(ar?"اعرض نتيجة الإلغاء الحالية قبل تنفيذ أي تغيير.":"Review the current cancellation outcome before anything changes.")} tone="danger" compact footer={<button className="bookingDangerAction" type="button" onClick={()=>void cancelReservation()} disabled={isBusy("cancel")}>{isBusy("cancel")?(ar?"جارٍ التحقق…":"Checking…"):(ar?"معاينة وإلغاء الحجز":"Preview cancellation")}</button>}>
      <div className={`bookingCancellationPreview ${currentCancellation.penaltyAmount<=0?"free":"penalty"}`}><span>{currentCancellation.penaltyAmount<=0?(ar?"بدون رسوم الآن":"No fee right now"):(ar?"رسوم الإلغاء الحالية":"Current cancellation penalty")}</span><strong>{money(currentCancellation.penaltyAmount,bookingMeta?.currency??"")}</strong>{bookingMeta?.paymentMode!=="PAY_AT_HOTEL" && <small>{ar?"قابل للاسترداد حاليًا":"Currently refundable"}: {money(currentCancellation.refundableAmount,bookingMeta?.currency??"")}</small>}</div>
      <p className="bookingCompactCopy">{ar?"فتح المعاينة لا يلغي الحجز. ستؤكد القرار فقط بعد رؤية الأرقام المحدثة.":"Opening the preview does not cancel the booking. You confirm only after seeing the refreshed amounts."}</p><InlineNotice notice={notices.cancel}/>
    </BookingActionCard>
  </div> : null;

  const leftLane = phase==="COMPLETED"
    ? <>{reviewCard??messagesCard}{reviewCard?null:linkCard}</>
    : phase==="CLOSED"
      ? <>{messagesCard}</>
      : <>{arrivalCard??requestsCard}{messagesCard}</>;
  const rightLane = phase==="COMPLETED"
    ? <>{reviewCard?messagesCard:null}{linkCard}</>
    : phase==="CLOSED"
      ? <>{linkCard}</>
      : <>{arrivalCard?requestsCard:null}{reviewCard}{linkCard}{cancellationCard}</>;

  return <div className="bookingToolsExperience">
    <header className="bookingManageHeader"><span className="eyebrow">{manageCopy.eyebrow}</span><h2>{manageCopy.title}</h2><p>{manageCopy.body}</p></header>
    <div className={`bookingToolsGrid bookingToolsDynamic bookingToolsPhase-${phase.toLowerCase()}`}>
      <div className="bookingToolsColumn bookingToolsLane">{leftLane}</div>
      <div className="bookingToolsColumn bookingToolsLane">{rightLane}</div>
    </div>
  </div>;
}

function managementCopy(phase:StayPhase,locale:Locale){
  const ar=locale==="ar";
  const values:Record<StayPhase,{eyebrow:string;title:string;body:string}> = ar ? {
    HOLD:{eyebrow:"إدارة الحجز",title:"أكمل حجزك",body:"راجع الوصول والدفع قبل انتهاء مدة تثبيت الغرفة."},
    UPCOMING:{eyebrow:"إدارة الإقامة",title:"جهّز إقامتك قبل الوصول",body:"حدد وقت الوصول، أرسل الطلبات وتواصل مع الفندق من هنا."},
    ARRIVAL_DAY:{eyebrow:"استعد للوصول",title:"الأهم اليوم: وصولك وتواصلك مع الفندق",body:"ابدأ بوقت الوصول ثم أرسل أي طلب أو رسالة تحتاجها قبل تسجيل الدخول."},
    IN_STAY:{eyebrow:"أثناء الإقامة",title:"كل ما تحتاجه خلال الإقامة",body:"أرسل الطلبات والرسائل مباشرة إلى الفندق بدون تشتيت."},
    COMPLETED:{eyebrow:"بعد الإقامة",title:"أكمل تجربتك",body:"شارك تقييمًا موثقًا أو تواصل مع الفندق بخصوص إقامتك السابقة."},
    CLOSED:{eyebrow:"سجل الحجز",title:"تفاصيل ما بعد الحجز",body:"تبقى الرسائل والسجل متاحين للرجوع إليهما عند الحاجة."},
  } : {
    HOLD:{eyebrow:"Manage booking",title:"Finish your reservation",body:"Review arrival and payment before the room hold expires."},
    UPCOMING:{eyebrow:"Manage your stay",title:"Prepare before you arrive",body:"Set your arrival time, send requests and contact the property here."},
    ARRIVAL_DAY:{eyebrow:"Prepare for arrival",title:"Today's priority: arrival and property contact",body:"Start with arrival time, then send any request or message you need before check-in."},
    IN_STAY:{eyebrow:"During your stay",title:"Everything you need while you're there",body:"Send requests and messages directly to the property from one place."},
    COMPLETED:{eyebrow:"After your stay",title:"Complete your experience",body:"Leave a verified review or contact the property about your completed stay."},
    CLOSED:{eyebrow:"Booking record",title:"After-booking details",body:"Messages and booking history remain available whenever you need them."},
  };
  return values[phase];
}

function EmptyState({text}:{text:string}){return <div className="bookingEmptyState"><Inbox size={17}/><span>{text}</span></div>;}
function InlineNotice({notice}:{notice:NoticeContent|undefined}){if(!notice)return null;return <div className={`bookingNotice ${notice.tone}`}>{notice.tone==="success"?<CheckCircle2 size={16}/>:<CircleAlert size={16}/>}<span>{notice.text}</span></div>;}
function reviewLabel(value:string,locale:Locale):string{if(locale!=="ar")return ({overall:"Overall",cleanliness:"Cleanliness",staff:"Staff",location:"Location",facilities:"Facilities",comfort:"Comfort",value:"Value"} as Record<string,string>)[value]??value;return ({overall:"التقييم العام",cleanliness:"النظافة",staff:"الموظفون",location:"الموقع",facilities:"المرافق",comfort:"الراحة",value:"القيمة"} as Record<string,string>)[value]??value;}
function categoryLabel(value:string,locale:Locale):string{if(locale!=="ar")return ({ARRIVAL:"Arrival & check-in",BEDDING:"Bed & bedding",ACCESSIBILITY:"Accessibility",TRANSPORT:"Transport",OTHER:"Other"} as Record<string,string>)[value]??value;return ({ARRIVAL:"الوصول وتسجيل الدخول",BEDDING:"السرير والفراش",ACCESSIBILITY:"سهولة الوصول",TRANSPORT:"النقل",OTHER:"أخرى"} as Record<string,string>)[value]??value;}
function requestStatusLabel(value:string,locale:Locale):string{if(locale!=="ar")return ({OPEN:"Open",ACKNOWLEDGED:"Seen by hotel",RESOLVED:"Resolved"} as Record<string,string>)[value]??value;return ({OPEN:"مفتوح",ACKNOWLEDGED:"تم الاطلاع",RESOLVED:"تم الحل"} as Record<string,string>)[value]??value;}
function formatClock(value:string,locale:Locale):string{const [hours,minutes]=value.split(":").map(Number);if(!Number.isFinite(hours)||!Number.isFinite(minutes))return value;const date=new Date(2000,0,1,hours,minutes);return date.toLocaleTimeString(locale==="ar"?"ar-JO":"en-US",{hour:"numeric",minute:"2-digit"});}
function formatMessageTime(value:string,locale:Locale):string{return new Date(value).toLocaleString(locale==="ar"?"ar-JO":"en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
function money(value:number,currency:string):string{return currency?`${value.toFixed(2)} ${currency}`:value.toFixed(2);}
function accessHeaders(bookingId:string):Record<string,string>{const token=sessionStorage.getItem(`booking-token:${bookingId}`);return token?{"x-booking-token":token}:{};}
async function api<T=unknown>(url:string,init?:RequestInit):Promise<T>{const response=await fetch(url,{...init,cache:"no-store"});const body=await response.json().catch(()=>null);if(!response.ok||body?.error)throw new Error(body?.error?.message||"Request failed");return body.data as T;}
