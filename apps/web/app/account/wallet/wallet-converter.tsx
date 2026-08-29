"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, CheckCircle2, Coins, WalletCards } from "lucide-react";
import type { Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  initialWalletBalance: number;
  initialPointsBalance: number;
  currency: string;
  pointsPerJod: number;
  minimumRedemptionPoints: number;
  redemptionStepPoints: number;
  redemptionAvailable: boolean;
  unavailableReason: string | null;
};

type WalletResponse = {
  currency:string;
  balance:number;
  pointsPerJod:number;
  minimumRedemptionPoints:number;
  redemptionStepPoints:number;
  convertiblePoints:number;
  convertibleAmount:number;
};

export function WalletConverter(props:Props) {
  const ar = props.locale === "ar";
  const [walletBalance,setWalletBalance] = useState(props.initialWalletBalance);
  const [pointsBalance,setPointsBalance] = useState(props.initialPointsBalance);
  const [points,setPoints] = useState(normalizeDefault(props.initialPointsBalance,props.minimumRedemptionPoints,props.redemptionStepPoints));
  const [loading,setLoading] = useState(false);
  const [message,setMessage] = useState<string|null>(null);
  const [error,setError] = useState<string|null>(null);

  const normalizedMax = pointsBalance - (pointsBalance % props.redemptionStepPoints);
  const valid = props.redemptionAvailable && points >= props.minimumRedemptionPoints && points <= pointsBalance && points % props.redemptionStepPoints === 0;
  const value = useMemo(()=>points / props.pointsPerJod,[points,props.pointsPerJod]);

  async function convert() {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/wallet/redeem", {
        method:"POST",
        headers:{"content-type":"application/json","idempotency-key":`wallet-redeem-${crypto.randomUUID()}`},
        body:JSON.stringify({points}),
      });
      const payload = await response.json().catch(()=>null) as {data?:WalletResponse;error?:{message?:string}}|null;
      if (!response.ok || !payload?.data || payload.error) throw new Error(payload?.error?.message || (ar?"تعذر تحويل النقاط":"Could not convert points"));
      setWalletBalance(payload.data.balance);
      const nextPoints = Math.max(0,pointsBalance-points);
      setPointsBalance(nextPoints);
      setPoints(normalizeDefault(nextPoints,payload.data.minimumRedemptionPoints,payload.data.redemptionStepPoints));
      setMessage(ar?`تمت إضافة ${value.toFixed(2)} ${props.currency} إلى محفظتك.`:`${value.toFixed(2)} ${props.currency} was added to your Wallet.`);
    } catch (cause) {
      setError(cause instanceof Error?cause.message:(ar?"تعذر تحويل النقاط":"Could not convert points"));
    } finally {
      setLoading(false);
    }
  }

  function selectAll() {
    if (props.redemptionAvailable && normalizedMax >= props.minimumRedemptionPoints) setPoints(normalizedMax);
  }

  return <section className="walletConvertCard">
    <div className="walletConvertIntro">
      <span className="walletConvertIcon"><ArrowRightLeft size={21}/></span>
      <div><span className="accountCardLabel">{ar?"تحويل المكافآت":"Convert Rewards"}</span><h2>{ar?"حوّل نقاطك إلى رصيد حجز":"Turn points into booking credit"}</h2><p>{ar?`${props.pointsPerJod.toLocaleString()} نقطة = 1 ${props.currency}. الرصيد يبقى في HandMeKey Wallet ويمكن استخدامه في الحجوزات.`:`${props.pointsPerJod.toLocaleString()} points = 1 ${props.currency}. Credit stays in HandMeKey Wallet and can be used on bookings.`}</p></div>
    </div>

    {props.unavailableReason && <div className="alertCard" style={{marginTop:14}}><div><strong>{ar?"التحويل غير متاح حاليًا":"Conversion currently unavailable"}</strong><p>{props.unavailableReason}</p></div></div>}

    <div className="walletConvertBalances">
      <div><Coins size={17}/><span>{ar?"نقاطك":"Your points"}</span><strong>{pointsBalance.toLocaleString()}</strong></div>
      <div><WalletCards size={17}/><span>{ar?"رصيد المحفظة":"Wallet balance"}</span><strong>{walletBalance.toFixed(2)} {props.currency}</strong></div>
    </div>

    <div className="walletConvertControl">
      <label><span>{ar?"عدد النقاط للتحويل":"Points to convert"}</span><input disabled={!props.redemptionAvailable} type="number" min={props.minimumRedemptionPoints} max={Math.max(props.minimumRedemptionPoints,normalizedMax)} step={props.redemptionStepPoints} value={points || ""} onChange={(event)=>setPoints(Number(event.target.value)||0)}/></label>
      <div className="walletConvertEquals"><span>{ar?"ستحصل على":"You’ll receive"}</span><strong>{valid?value.toFixed(2):"0.00"} {props.currency}</strong></div>
      <button type="button" className="walletAllButton" disabled={!props.redemptionAvailable||normalizedMax < props.minimumRedemptionPoints} onClick={selectAll}>{ar?"تحويل الحد المتاح":"Use available points"}</button>
    </div>

    <div className="walletConvertFooter">
      <p>{ar?`الحد الأدنى ${props.minimumRedemptionPoints.toLocaleString()} نقطة، والتحويل بخطوات ${props.redemptionStepPoints} نقطة. الرصيد غير قابل للسحب نقدًا.`:`Minimum ${props.minimumRedemptionPoints.toLocaleString()} points, in steps of ${props.redemptionStepPoints}. Wallet credit is not cash-withdrawable.`}</p>
      <button type="button" className="walletConvertButton" disabled={!valid||loading} onClick={convert}>{loading?(ar?"جارٍ التحويل…":"Converting…"):(ar?"تحويل إلى المحفظة":"Convert to Wallet")}</button>
    </div>
    {message&&<div className="walletConvertSuccess"><CheckCircle2 size={16}/>{message}</div>}
    {error&&<p className="danger">{error}</p>}
  </section>;
}

function normalizeDefault(points:number,min:number,step:number) {
  const normalized = points - (points % step);
  if (normalized < min) return 0;
  return Math.min(normalized, Math.max(min,1000 - (1000 % step)));
}
