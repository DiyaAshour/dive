export type EmailContent = Readonly<{subject: string; html: string; text: string}>;

type BookingEmailInput = Readonly<{
  kind: "CONFIRMED" | "MODIFIED" | "CANCELLED";
  guestName: string;
  hotelName: string;
  bookingReference: string;
  arrival: string;
  departure: string;
  total: number;
  currency: string;
  paymentLabel: string;
  invoiceUrl?: string | null;
  bookingUrl: string;
  cancellationPenalty?: number | null;
  refundableAmount?: number | null;
}>;

export function bookingEmail(input: BookingEmailInput): EmailContent {
  const confirmed = input.kind === "CONFIRMED";
  const modified = input.kind === "MODIFIED";
  const subject = confirmed
    ? `Booking confirmed · ${input.hotelName} · ${input.bookingReference}`
    : modified
      ? `Booking updated · ${input.hotelName} · ${input.bookingReference}`
      : `Booking cancelled · ${input.hotelName} · ${input.bookingReference}`;
  const titleEn = confirmed ? "Your booking is confirmed" : modified ? "Your booking was updated" : "Your booking was cancelled";
  const titleAr = confirmed ? "تم تأكيد حجزك" : modified ? "تم تحديث حجزك" : "تم إلغاء حجزك";
  const extra = input.kind === "CANCELLED"
    ? `<tr><td style="padding:6px 0;color:#64748b">Cancellation fee / رسوم الإلغاء</td><td style="padding:6px 0;text-align:right;font-weight:700">${money(input.cancellationPenalty ?? 0, input.currency)}</td></tr><tr><td style="padding:6px 0;color:#64748b">Refundable / قابل للاسترداد</td><td style="padding:6px 0;text-align:right;font-weight:700">${money(input.refundableAmount ?? 0, input.currency)}</td></tr>`
    : "";
  const invoiceButton = input.invoiceUrl ? `<a href="${escapeAttr(input.invoiceUrl)}" style="display:inline-block;margin:8px 8px 0 0;padding:11px 18px;border:1px solid #0f2747;border-radius:10px;color:#0f2747;text-decoration:none;font-weight:700">Invoice / الفاتورة</a>` : "";
  const html = layout(`${titleEn} · ${titleAr}`, `
    <p style="margin:0 0 18px">Hello ${escapeHtml(input.guestName)} · مرحباً ${escapeHtml(input.guestName)}</p>
    <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:14px;padding:14px">
      ${row("Booking / الحجز", input.bookingReference)}
      ${row("Hotel / الفندق", input.hotelName)}
      ${row("Check-in / الوصول", input.arrival)}
      ${row("Check-out / المغادرة", input.departure)}
      ${row("Total / الإجمالي", money(input.total, input.currency))}
      ${row("Payment / الدفع", input.paymentLabel)}
      ${extra}
    </table>
    <div style="margin-top:18px"><a href="${escapeAttr(input.bookingUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0f2747;color:white;text-decoration:none;font-weight:700">Manage booking / إدارة الحجز</a>${invoiceButton}</div>
    <p style="margin:20px 0 0;color:#64748b;font-size:13px">HandMeKey shows the stored booking terms and live reservation state. Keep this email for your records.</p>
  `);
  const text = `${titleEn} / ${titleAr}\n\nBooking: ${input.bookingReference}\nHotel: ${input.hotelName}\nCheck-in: ${input.arrival}\nCheck-out: ${input.departure}\nTotal: ${money(input.total,input.currency)}\nPayment: ${input.paymentLabel}${input.kind === "CANCELLED" ? `\nCancellation fee: ${money(input.cancellationPenalty ?? 0,input.currency)}\nRefundable: ${money(input.refundableAmount ?? 0,input.currency)}` : ""}\n\nManage booking: ${input.bookingUrl}${input.invoiceUrl ? `\nInvoice: ${input.invoiceUrl}` : ""}`;
  return {subject, html, text};
}

export function partnerBookingEmail(input: Readonly<{kind: "CONFIRMED" | "MODIFIED" | "CANCELLED"; hotelName: string; reference: string; guestName: string; arrival: string; departure: string; total: number; currency: string; dashboardUrl: string}>): EmailContent {
  const verb = input.kind === "CONFIRMED" ? "New confirmed booking" : input.kind === "MODIFIED" ? "Booking updated" : "Booking cancelled";
  const subject = `${verb} · ${input.reference} · ${input.hotelName}`;
  return {
    subject,
    html: layout(subject, `<p><strong>${escapeHtml(input.guestName)}</strong> · ${escapeHtml(input.reference)}</p><p>${escapeHtml(input.arrival)} → ${escapeHtml(input.departure)} · ${money(input.total,input.currency)}</p><a href="${escapeAttr(input.dashboardUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0f2747;color:white;text-decoration:none;font-weight:700">Open reservation</a>`),
    text: `${subject}\n${input.guestName}\n${input.arrival} → ${input.departure}\n${money(input.total,input.currency)}\n${input.dashboardUrl}`,
  };
}

export function passwordResetEmail(input: Readonly<{displayName: string; resetUrl: string}>): EmailContent {
  const subject = "Reset your HandMeKey password";
  return actionEmail(subject, `Hello ${input.displayName}`, "A password reset was requested for your HandMeKey account. The link expires in 30 minutes.", "تم طلب إعادة تعيين كلمة مرور حساب HandMeKey. تنتهي صلاحية الرابط خلال 30 دقيقة.", "Reset password / إعادة تعيين كلمة المرور", input.resetUrl);
}

export function verificationEmail(input: Readonly<{displayName: string; verifyUrl: string}>): EmailContent {
  const subject = "Verify your HandMeKey email";
  return actionEmail(subject, `Hello ${input.displayName}`, "Verify this email address to secure account recovery and booking communications.", "أكد عنوان البريد الإلكتروني لتأمين استعادة الحساب ورسائل الحجوزات.", "Verify email / تأكيد البريد", input.verifyUrl);
}

export function securityAlertEmail(input: Readonly<{displayName: string}>): EmailContent {
  const subject = "Your HandMeKey password was changed";
  return {
    subject,
    html: layout(subject, `<p>Hello ${escapeHtml(input.displayName)},</p><p>Your HandMeKey password was changed and existing sessions were signed out.</p><p dir="rtl">تم تغيير كلمة مرور HandMeKey وتم تسجيل خروج الجلسات السابقة.</p><p>If you did not make this change, contact HandMeKey support immediately.</p>`),
    text: `${subject}\n\nYour password was changed and existing sessions were signed out. If this was not you, contact HandMeKey support immediately.\n\nتم تغيير كلمة المرور وتسجيل خروج الجلسات السابقة. إذا لم تكن أنت، تواصل مع دعم HandMeKey فوراً.`,
  };
}

export function priceWatchEmail(input: Readonly<{title: string; body: string; url: string}>): EmailContent {
  return {
    subject: input.title,
    html: layout(input.title, `<p>${escapeHtml(input.body)}</p><a href="${escapeAttr(input.url)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0f2747;color:white;text-decoration:none;font-weight:700">View live price / شاهد السعر المباشر</a>`),
    text: `${input.title}\n\n${input.body}\n\n${input.url}`,
  };
}

export function manualEmailContent(input: Readonly<{subject: string; textBody: string}>): EmailContent {
  if (/enjoy\s+your\s+holiday/i.test(input.subject)) return holidayEmail(input);
  const paragraphs = input.textBody.split(/\n{2,}/).map((part) => `<p style="white-space:pre-wrap;line-height:1.7">${escapeHtml(part)}</p>`).join("");
  return {
    subject: input.subject,
    html: layout(input.subject, `${paragraphs}<p style="margin-top:24px;color:#64748b;font-size:13px">HandMeKey Support · support@handmekey.com</p>`),
    text: input.textBody,
  };
}

function holidayEmail(input: Readonly<{subject: string; textBody: string}>): EmailContent {
  const paragraphs = input.textBody
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p dir="ltr" style="margin:0 0 18px;direction:ltr;text-align:left;white-space:pre-wrap;line-height:1.75;color:#2b3b4f;font-size:15px">${escapeHtml(part)}</p>`)
    .join("");
  const siteUrl = publicSiteUrl();
  const logoUrl = `${siteUrl}/brand/hmk-2026-header-dark.svg`;
  const html = `<!doctype html>
<html dir="ltr">
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(input.subject)}</title>
</head>
<body dir="ltr" style="margin:0;padding:0;direction:ltr;text-align:left;background:#eef1f4;font-family:Arial,Helvetica,sans-serif;color:#132238">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">A quick note from HandMeKey — enjoy your holiday.</div>
  <table role="presentation" dir="ltr" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;direction:ltr;text-align:left;background:#eef1f4">
    <tr>
      <td align="center" style="padding:30px 14px">
        <table role="presentation" dir="ltr" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;direction:ltr;text-align:left;border-collapse:separate;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 16px 42px rgba(15,39,71,.12)">
          <tr>
            <td style="padding:20px 24px;background:#06182a">
              <table role="presentation" dir="ltr" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle" style="width:55%">
                    <img src="${escapeAttr(logoUrl)}" width="168" alt="HandMeKey" style="display:block;width:168px;max-width:100%;height:auto;border:0">
                  </td>
                  <td valign="middle" align="right" style="color:#cbd5e1;font-size:11px;line-height:1.4;letter-spacing:.03em">A quick note, nothing more</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 30px;background:#fffaf0">
              <div style="width:56px;height:4px;background:#d4a52e;border-radius:0 0 5px 5px"></div>
            </td>
          </tr>
          <tr>
            <td dir="ltr" align="left" style="padding:30px 30px 28px;direction:ltr;text-align:left;background:#fffaf0;border-bottom:1px solid #efe6d2">
              <div style="margin:0 0 12px;color:#8a6819;font-size:11px;font-weight:800;letter-spacing:.14em">TIME TO UNPLUG</div>
              <h1 style="margin:0;color:#06182a;font-size:36px;line-height:1.08;letter-spacing:-1px">Enjoy your holiday.</h1>
              <p style="margin:12px 0 0;color:#667085;font-size:14px;line-height:1.65">No action needed — just wishing you a great break.</p>
            </td>
          </tr>
          <tr>
            <td dir="ltr" align="left" style="padding:30px 30px 22px;direction:ltr;text-align:left;background:#ffffff">
              ${paragraphs}
            </td>
          </tr>
          <tr>
            <td style="padding:17px 30px;border-top:1px solid #edf0f3;background:#fbfcfd">
              <table role="presentation" dir="ltr" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="color:#0f2747;font-size:13px;font-weight:800">HandMeKey</td>
                  <td align="right" style="color:#7a8592;font-size:11px">Hotels, clearly priced</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <div style="margin:15px auto 0;color:#8b96a3;font-size:11px;line-height:1.5;text-align:center">Sent with HandMeKey · ${escapeHtml(siteUrl.replace(/^https?:\/\//i, ""))}</div>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return {subject: input.subject, html, text: input.textBody};
}

function publicSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configured && /^https?:\/\//i.test(configured)) return configured;
  return "https://handmekey.com";
}

function actionEmail(subject:string, greeting:string, en:string, ar:string, label:string, url:string):EmailContent {
  return {
    subject,
    html: layout(subject, `<p>${escapeHtml(greeting)}</p><p>${escapeHtml(en)}</p><p dir="rtl">${escapeHtml(ar)}</p><a href="${escapeAttr(url)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0f2747;color:white;text-decoration:none;font-weight:700">${escapeHtml(label)}</a>`),
    text: `${subject}\n\n${greeting}\n${en}\n${ar}\n\n${url}`,
  };
}

function layout(title:string, body:string):string {
  return `<!doctype html><html><body style="margin:0;background:#f3f6f8;font-family:Arial,sans-serif;color:#132238"><div style="max-width:640px;margin:0 auto;padding:28px 16px"><div style="font-weight:800;font-size:21px;color:#0f2747;margin-bottom:18px">HandMeKey</div><div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:28px"><h1 style="font-size:24px;margin:0 0 18px">${escapeHtml(title)}</h1>${body}</div><p style="font-size:12px;color:#64748b;text-align:center;margin:16px">HandMeKey · Hotels, clearly priced</p></div></body></html>`;
}

function row(label:string,value:string):string {return `<tr><td style="padding:6px 0;color:#64748b">${escapeHtml(label)}</td><td style="padding:6px 0;text-align:right;font-weight:700">${escapeHtml(value)}</td></tr>`;}
function money(value:number,currency:string):string {return `${value.toFixed(2)} ${currency}`;}
export function escapeHtml(value:string):string {return value.replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]??char));}
function escapeAttr(value:string):string {return escapeHtml(value);}
