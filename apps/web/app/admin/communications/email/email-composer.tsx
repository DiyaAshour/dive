"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Monitor, Send, Smartphone, Sparkles, SunMedium } from "lucide-react";

const TEMPLATES = [
  {id:"custom",labelAr:"رسالة فارغة",labelEn:"Blank email",subject:"",body:""},
  {id:"holiday",labelAr:"Quick — استمتع بإجازتك",labelEn:"Quick — Enjoy your holiday",subject:"Enjoy your holiday · HandMeKey",body:"Hi,\n\nWishing you a wonderful holiday.\n\nHope you get the chance to switch off, recharge, and enjoy the time away. We’ll see you when you’re back.\n\nEnjoy every minute.\n\nWarm wishes,\nHandMeKey"},
  {id:"general",labelAr:"خدمة العملاء",labelEn:"Guest support",subject:"HandMeKey support",body:"مرحباً،\n\nنتواصل معك من فريق HandMeKey لمساعدتك بخصوص طلبك. إذا كان لديك أي تفاصيل إضافية، يمكنك الرد مباشرة على هذه الرسالة وسنستمر معك في نفس المحادثة.\n\nمع التحية،\nفريق HandMeKey\n\nHello,\n\nThis is the HandMeKey team following up to help with your request. You can reply directly to this email and we will continue in the same conversation.\n\nKind regards,\nHandMeKey Team"},
  {id:"booking",labelAr:"متابعة حجز",labelEn:"Booking follow-up",subject:"Follow-up on your HandMeKey booking",body:"مرحباً،\n\nنتابع معك بخصوص حجزك على HandMeKey. يرجى الرد على هذه الرسالة إذا احتجت أي تعديل أو مساعدة قبل موعد الوصول.\n\nمع التحية،\nفريق HandMeKey\n\nHello,\n\nWe are following up regarding your HandMeKey booking. Reply to this email if you need any change or assistance before arrival.\n\nKind regards,\nHandMeKey Team"},
  {id:"payment",labelAr:"مساعدة بالدفع",labelEn:"Payment assistance",subject:"Payment assistance · HandMeKey",body:"مرحباً،\n\nنتواصل معك لمساعدتك بخصوص عملية الدفع. لا ترسل بيانات البطاقة أو رمز التحقق عبر البريد الإلكتروني. أخبرنا فقط بالمشكلة التي ظهرت لك وسنساعدك بخطوة آمنة.\n\nفريق HandMeKey\n\nHello,\n\nWe are contacting you to assist with payment. Please do not send card details or verification codes by email. Tell us only what issue you saw and we will guide you through a secure next step.\n\nHandMeKey Team"},
  {id:"refund",labelAr:"تحديث استرداد",labelEn:"Refund update",subject:"Refund update · HandMeKey",body:"مرحباً،\n\nهذا تحديث بخصوص طلب الاسترداد الخاص بك. سنبقيك على اطلاع من خلال نفس سلسلة البريد حتى اكتمال المعالجة.\n\nمع التحية،\nفريق HandMeKey\n\nHello,\n\nThis is an update regarding your refund request. We will keep you informed in this same email thread until processing is complete.\n\nKind regards,\nHandMeKey Team"},
  {id:"documents",labelAr:"طلب مستندات",labelEn:"Document request",subject:"Documents required · HandMeKey",body:"مرحباً،\n\nنحتاج بعض المعلومات أو المستندات الإضافية لإكمال طلبك. يرجى الرد على هذه الرسالة بالتفاصيل المطلوبة فقط، وتجنب إرسال كلمات المرور أو بيانات البطاقات.\n\nفريق HandMeKey\n\nHello,\n\nWe need some additional information or documents to complete your request. Please reply with only the requested information and never send passwords or card details.\n\nHandMeKey Team"},
  {id:"partner",labelAr:"تواصل مع فندق",labelEn:"Property partner",subject:"HandMeKey property partnership",body:"مرحباً،\n\nنتواصل معكم من HandMeKey بخصوص إدارة وعرض منشأتكم على المنصة. يمكنكم الرد مباشرة على هذه الرسالة وسيتابع فريقنا معكم ضمن نفس المحادثة.\n\nمع التحية،\nHandMeKey\n\nHello,\n\nWe are contacting you from HandMeKey regarding managing and listing your property on the platform. Reply directly to this email and our team will continue with you in the same conversation.\n\nKind regards,\nHandMeKey"},
  {id:"welcome",labelAr:"ترحيب",labelEn:"Welcome",subject:"Welcome to HandMeKey",body:"أهلاً بك في HandMeKey،\n\nيسعدنا وجودك معنا. إذا احتجت أي مساعدة بخصوص حجز أو حسابك، يمكنك الرد مباشرة على هذه الرسالة.\n\nفريق HandMeKey\n\nWelcome to HandMeKey,\n\nWe are glad to have you with us. If you need help with a booking or your account, reply directly to this email.\n\nHandMeKey Team"},
] as const;

type Props = Readonly<{
  locale: "ar" | "en";
  mode?: "compose" | "reply";
  conversationId?: string;
  initialTo?: string;
  initialName?: string | null;
  initialSubject?: string;
}>;

export function EmailComposer({locale, mode = "compose", conversationId, initialTo = "", initialName = "", initialSubject = ""}: Props) {
  const ar = locale === "ar";
  const router = useRouter();
  const [templateId, setTemplateId] = useState("custom");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [toEmail, setToEmail] = useState(initialTo);
  const [toName, setToName] = useState(initialName ?? "");
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = useMemo(() => TEMPLATES.find((item) => item.id === templateId) ?? TEMPLATES[0], [templateId]);
  const holidayPreview = mode === "compose" && selected.id === "holiday";
  const previewParagraphs = useMemo(() => body.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean), [body]);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const template = TEMPLATES.find((item) => item.id === id) ?? TEMPLATES[0];
    if (mode === "compose") setSubject(template.subject);
    setBody(template.body);
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/v1/admin/communications/email/send", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({conversationId: conversationId ?? null,toEmail,toName,subject,textBody:body})});
      const payload = await response.json().catch(() => null) as {data?: {conversationId?: string}; error?: {message?: string}} | null;
      if (!response.ok || !payload?.data?.conversationId) throw new Error(payload?.error?.message ?? (ar ? "تعذر إرسال الرسالة" : "Unable to queue email"));
      router.push(`/admin/communications/email/conversations/${payload.data.conversationId}`);
      router.refresh();
      if (mode === "reply") setBody("");
    } catch (err) { setError(err instanceof Error ? err.message : (ar ? "حدث خطأ غير متوقع" : "Unexpected error")); }
    finally { setBusy(false); }
  }

  return <form className={`emailComposer ${mode === "reply" ? "emailReplyComposer" : ""}`} onSubmit={send}>
    {mode === "compose" && <div className="emailTemplateBar">
      <span><Sparkles size={17}/>{ar ? "قالب جاهز" : "Ready template"}</span>
      <select value={templateId} onChange={(event) => applyTemplate(event.target.value)}>{TEMPLATES.map((template) => <option value={template.id} key={template.id}>{ar ? template.labelAr : template.labelEn}</option>)}</select>
      {selected.id !== "custom" && <small><FileText size={14}/>{ar ? "يمكنك تعديل النص بالكامل قبل الإرسال" : "You can edit everything before sending"}</small>}
      {holidayPreview && <span className="holidayTemplateChip"><SunMedium size={14}/>{ar ? "تصميم HandMeKey خاص" : "HandMeKey signature design"}</span>}
    </div>}
    <div className="emailComposeFields">
      <label><span>{ar ? "إلى" : "To"}</span><input type="email" value={toEmail} onChange={(event) => setToEmail(event.target.value)} disabled={mode === "reply"} required placeholder="guest@example.com"/></label>
      {mode === "compose" && <label><span>{ar ? "الاسم (اختياري)" : "Name (optional)"}</span><input value={toName} onChange={(event) => setToName(event.target.value)} maxLength={120} placeholder={ar ? "اسم المستلم" : "Recipient name"}/></label>}
      <label className="emailComposeSubject"><span>{ar ? "الموضوع" : "Subject"}</span><input value={subject} onChange={(event) => setSubject(event.target.value)} disabled={mode === "reply"} maxLength={180} required/></label>
    </div>
    <label className="emailComposeBody"><span>{ar ? "الرسالة" : "Message"}</span><textarea dir={holidayPreview ? "ltr" : "auto"} style={holidayPreview ? {textAlign:"left"} : undefined} value={body} onChange={(event) => setBody(event.target.value)} maxLength={50000} required rows={mode === "reply" ? 7 : 16} placeholder={ar ? "اكتب رسالتك هنا…" : "Write your email…"}/></label>

    {holidayPreview && <section className="holidayPreviewSection" aria-label={ar ? "معاينة البريد" : "Email preview"}>
      <div className="holidayPreviewHead">
        <div>
          <span className="holidayPreviewEyebrow">{ar ? "معاينة مباشرة" : "LIVE PREVIEW"}</span>
          <strong>{ar ? "هكذا ستظهر الرسالة تقريباً للمستلم" : "A close preview of what the recipient will see"}</strong>
        </div>
        <div className="holidayPreviewToggle" role="group" aria-label={ar ? "حجم المعاينة" : "Preview size"}>
          <button type="button" className={previewMode === "desktop" ? "active" : ""} onClick={() => setPreviewMode("desktop")}><Monitor size={15}/>{ar ? "كمبيوتر" : "Desktop"}</button>
          <button type="button" className={previewMode === "mobile" ? "active" : ""} onClick={() => setPreviewMode("mobile")}><Smartphone size={15}/>{ar ? "هاتف" : "Mobile"}</button>
        </div>
      </div>
      <div className={`holidayPreviewStage ${previewMode}`}>
        <div className="holidayEmailMock" dir="ltr">
          <div className="holidayEmailBrand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/hmk-2026-header-dark.svg" alt="HandMeKey"/>
            <span>{ar ? "رسالة سريعة، بدون ضجيج" : "A quick note, nothing more"}</span>
          </div>
          <div className="holidayEmailHero">
            <span><SunMedium size={16}/>{ar ? "وقت للاستراحة" : "TIME TO UNPLUG"}</span>
            <h2>Enjoy your holiday.</h2>
            <p>{ar ? "لا يوجد إجراء مطلوب — فقط نتمنى لك إجازة رائعة." : "No action needed — just wishing you a great break."}</p>
          </div>
          <div className="holidayEmailBody">
            {previewParagraphs.length ? previewParagraphs.map((paragraph, index) => <p dir="auto" key={`${index}-${paragraph.slice(0,20)}`}>{paragraph}</p>) : <p>{ar ? "سيظهر نص الرسالة هنا." : "Your message will appear here."}</p>}
          </div>
          <div className="holidayEmailFooter"><span>HandMeKey</span><small>Hotels, clearly priced</small></div>
        </div>
      </div>
    </section>}

    <div className="emailComposeFoot">
      <small>{ar ? "يمكن للمستلم الرد مباشرة، وسيظهر الرد داخل نفس المحادثة عند تفعيل البريد الوارد." : "The recipient can reply directly; inbound replies appear in this conversation when inbound email is configured."}</small>
      <button className="primaryButton" type="submit" disabled={busy}><Send size={16}/>{busy ? (ar ? "جارٍ وضعها في الإرسال…" : "Queuing…") : mode === "reply" ? (ar ? "إرسال الرد" : "Send reply") : (ar ? "إرسال الرسالة" : "Send email")}</button>
    </div>
    {error && <p className="opsError">{error}</p>}

    <style jsx>{`
      .holidayTemplateChip{margin-inline-start:auto;display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid rgba(184,134,11,.24);border-radius:999px;background:#fff8e6;color:#7a5813;font-size:.76rem;font-weight:800}
      .holidayPreviewSection{margin:18px 20px 0;border:1px solid #dce3ea;border-radius:18px;overflow:hidden;background:#f7f8fa}
      .holidayPreviewHead{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 16px;border-bottom:1px solid #e1e6ec;background:#fff}
      .holidayPreviewHead>div:first-child{display:grid;gap:3px}.holidayPreviewEyebrow{font-size:.68rem;font-weight:900;letter-spacing:.12em;color:#8a6819}.holidayPreviewHead strong{font-size:.86rem;color:#25364a}
      .holidayPreviewToggle{display:inline-flex;gap:4px;padding:4px;border:1px solid #d8e0e8;border-radius:11px;background:#f5f7f9}.holidayPreviewToggle button{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:8px;padding:7px 9px;background:transparent;color:#5d6b7a;font:inherit;font-size:.76rem;font-weight:800;cursor:pointer}.holidayPreviewToggle button.active{background:#0f2747;color:#fff;box-shadow:0 2px 8px rgba(15,39,71,.14)}
      .holidayPreviewStage{padding:28px;overflow:hidden;background:radial-gradient(circle at 10% 0%,rgba(212,165,46,.12),transparent 30%),#eef1f4}.holidayPreviewStage.desktop .holidayEmailMock{width:min(100%,640px)}.holidayPreviewStage.mobile .holidayEmailMock{width:100%;max-width:360px}
      .holidayEmailMock{direction:ltr;text-align:left;margin:0 auto;border-radius:20px;overflow:hidden;background:#fff;box-shadow:0 18px 50px rgba(15,39,71,.12)}
      .holidayEmailBrand{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 22px;background:#06182a}.holidayEmailBrand img{display:block;width:148px;max-width:48%;height:auto}.holidayEmailBrand span{font-size:.69rem;color:#cbd5e1;white-space:nowrap}
      .holidayEmailHero{position:relative;padding:34px 30px 30px;background:linear-gradient(145deg,#fffaf0,#fff 68%);border-bottom:1px solid #efe6d2}.holidayEmailHero:after{content:"";position:absolute;top:0;left:30px;width:54px;height:4px;border-radius:0 0 5px 5px;background:#d4a52e}.holidayEmailHero>span{display:inline-flex;align-items:center;gap:6px;margin-bottom:12px;color:#8a6819;font-size:.68rem;font-weight:900;letter-spacing:.12em}.holidayEmailHero h2{margin:0;color:#06182a;font-size:clamp(1.65rem,4vw,2.35rem);letter-spacing:-.035em}.holidayEmailHero p{margin:10px 0 0;max-width:460px;color:#667085;font-size:.9rem;line-height:1.6}
      .holidayEmailBody{direction:ltr;text-align:left;padding:28px 30px 22px;color:#27384b}.holidayEmailBody p{margin:0 0 16px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.72;font-size:.92rem}.holidayEmailBody p:last-child{margin-bottom:0}
      .holidayEmailFooter{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 30px;border-top:1px solid #edf0f3;background:#fbfcfd}.holidayEmailFooter span{font-weight:900;color:#0f2747}.holidayEmailFooter small{color:#7a8592}
      .holidayPreviewStage.mobile{padding:0;background:#fff}.holidayPreviewStage.mobile .holidayEmailMock{border-radius:0;box-shadow:none}.holidayPreviewStage.mobile .holidayEmailBrand{padding:15px 16px}.holidayPreviewStage.mobile .holidayEmailBrand span{display:none}.holidayPreviewStage.mobile .holidayEmailBrand img{max-width:none;width:128px}.holidayPreviewStage.mobile .holidayEmailHero{padding:28px 20px 24px}.holidayPreviewStage.mobile .holidayEmailHero:after{left:20px}.holidayPreviewStage.mobile .holidayEmailBody{padding:22px 20px 18px}.holidayPreviewStage.mobile .holidayEmailFooter{padding:14px 20px}.holidayPreviewStage.mobile .holidayEmailFooter small{font-size:.68rem}
      @media(max-width:760px){.holidayTemplateChip{margin-inline-start:0}.holidayPreviewSection{margin:14px 14px 0}.holidayPreviewHead{align-items:stretch;flex-direction:column}.holidayPreviewToggle{align-self:flex-start}.holidayPreviewStage{padding:18px 10px}.holidayPreviewStage.desktop .holidayEmailMock{width:100%}.holidayPreviewStage.mobile{padding:0}}
      @media(max-width:480px){.holidayPreviewToggle{width:100%}.holidayPreviewToggle button{flex:1;justify-content:center}.holidayEmailBrand span{display:none}.holidayEmailBrand img{max-width:none;width:128px}.holidayEmailHero{padding:28px 20px 24px}.holidayEmailHero:after{left:20px}.holidayEmailBody{padding:22px 20px 18px}.holidayEmailFooter{padding:14px 20px}.holidayEmailFooter small{font-size:.68rem}}
    `}</style>
  </form>;
}
