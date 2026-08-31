"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, CheckCircle2, Coins, WalletCards } from "lucide-react";
import { guestIntlLocale, type GuestLocale } from "@/lib/guest-market";
import { walletUiCopy } from "@/lib/wallet-ui-copy";

type Props = {
  locale: GuestLocale;
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
  const copy=walletUiCopy(props.locale);
  const intlLocale=guestIntlLocale(props.locale);
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
    setLoading(true);setError(null);setMessage(null);
    try {
      const response = await fetch("/api/v1/wallet/redeem", {
        method:"POST",
        headers:{"content-type":"application/json","idempotency-key":`wallet-redeem-${crypto.randomUUID()}`},
        body:JSON.stringify({points}),
      });
      const payload = await response.json().catch(()=>null) as {data?:WalletResponse;error?:{message?:string}}|null;
      if (!response.ok || !payload?.data || payload.error) throw new Error(payload?.error?.message || copy.convertFail);
      setWalletBalance(payload.data.balance);
      const nextPoints = Math.max(0,pointsBalance-points);
      setPointsBalance(nextPoints);
      setPoints(normalizeDefault(nextPoints,payload.data.minimumRedemptionPoints,payload.data.redemptionStepPoints));
      setMessage(copy.converted(value.toLocaleString(intlLocale,{minimumFractionDigits:2,maximumFractionDigits:2}),props.currency));
    } catch (cause) {
      setError(cause instanceof Error?cause.message:copy.convertFail);
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
      <div><span className="accountCardLabel">{copy.convertRewards}</span><h2>{copy.convertTitle}</h2><p>{copy.convertBody(props.pointsPerJod,props.currency)}</p></div>
    </div>

    {props.unavailableReason && <div className="alertCard" style={{marginTop:14}}><div><strong>{copy.conversionUnavailable}</strong><p>{props.unavailableReason}</p></div></div>}

    <div className="walletConvertBalances">
      <div><Coins size={17}/><span>{copy.yourPoints}</span><strong>{pointsBalance.toLocaleString(intlLocale)}</strong></div>
      <div><WalletCards size={17}/><span>{copy.walletBalance}</span><strong>{walletBalance.toLocaleString(intlLocale,{minimumFractionDigits:2,maximumFractionDigits:2})} {props.currency}</strong></div>
    </div>

    <div className="walletConvertControl">
      <label><span>{copy.pointsToConvert}</span><input disabled={!props.redemptionAvailable} type="number" min={props.minimumRedemptionPoints} max={Math.max(props.minimumRedemptionPoints,normalizedMax)} step={props.redemptionStepPoints} value={points || ""} onChange={(event)=>setPoints(Number(event.target.value)||0)}/></label>
      <div className="walletConvertEquals"><span>{copy.youReceive}</span><strong>{valid?value.toLocaleString(intlLocale,{minimumFractionDigits:2,maximumFractionDigits:2}):"0.00"} {props.currency}</strong></div>
      <button type="button" className="walletAllButton" disabled={!props.redemptionAvailable||normalizedMax < props.minimumRedemptionPoints} onClick={selectAll}>{copy.useAvailable}</button>
    </div>

    <div className="walletConvertFooter">
      <p>{copy.minimum(props.minimumRedemptionPoints.toLocaleString(intlLocale),props.redemptionStepPoints.toLocaleString(intlLocale))}</p>
      <button type="button" className="walletConvertButton" disabled={!valid||loading} onClick={convert}>{loading?copy.converting:copy.convertToWallet}</button>
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
