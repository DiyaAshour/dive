"use client";
export function PrintInvoiceButton({label}:{label:string}){return <button className="invoicePrintButton" type="button" onClick={()=>window.print()}>{label}</button>}
