"use client";

export function VoucherActions({label}: Readonly<{label: string}>) {
  return <button type="button" className="primary" onClick={() => window.print()}>{label}</button>;
}
