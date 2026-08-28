"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Send, Sparkles } from "lucide-react";

const TEMPLATES = [
  {id:"custom",labelAr:"رسالة فارغة",labelEn:"Blank email",subject:"",body:""},
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
  const [toEmail, setToEmail] = useState(initialTo);
  const [toName, setToName] = useState(initialName ?? "");
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = useMemo(() => TEMPLATES.find((item) => item.id === templateId) ?? TEMPLATES[0], [templateId]);

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
    </div>}
    <div className="emailComposeFields">
      <label><span>{ar ? "إلى" : "To"}</span><input type="email" value={toEmail} onChange={(event) => setToEmail(event.target.value)} disabled={mode === "reply"} required placeholder="guest@example.com"/></label>
      {mode === "compose" && <label><span>{ar ? "الاسم (اختياري)" : "Name (optional)"}</span><input value={toName} onChange={(event) => setToName(event.target.value)} maxLength={120} placeholder={ar ? "اسم المستلم" : "Recipient name"}/></label>}
      <label className="emailComposeSubject"><span>{ar ? "الموضوع" : "Subject"}</span><input value={subject} onChange={(event) => setSubject(event.target.value)} disabled={mode === "reply"} maxLength={180} required/></label>
    </div>
    <label className="emailComposeBody"><span>{ar ? "الرسالة" : "Message"}</span><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={50000} required rows={mode === "reply" ? 7 : 16} placeholder={ar ? "اكتب رسالتك هنا…" : "Write your email…"}/></label>
    <div className="emailComposeFoot">
      <small>{ar ? "يمكن للمستلم الرد مباشرة، وسيظهر الرد داخل نفس المحادثة عند تفعيل البريد الوارد." : "The recipient can reply directly; inbound replies appear in this conversation when inbound email is configured."}</small>
      <button className="primaryButton" type="submit" disabled={busy}><Send size={16}/>{busy ? (ar ? "جارٍ وضعها في الإرسال…" : "Queuing…") : mode === "reply" ? (ar ? "إرسال الرد" : "Send reply") : (ar ? "إرسال الرسالة" : "Send email")}</button>
    </div>
    {error && <p className="opsError">{error}</p>}
  </form>;
}
