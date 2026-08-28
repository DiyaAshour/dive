import type { NextConfig } from "next";

const production = process.env.NODE_ENV === "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${production ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {key:"Content-Security-Policy",value:csp},
  {key:"X-Content-Type-Options",value:"nosniff"},
  {key:"X-Frame-Options",value:"DENY"},
  {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
  {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=(self), payment=(self)"},
  {key:"Cross-Origin-Opener-Policy",value:"same-origin"},
  ...(production ? [{key:"Strict-Transport-Security",value:"max-age=31536000; includeSubDomains; preload"}] : []),
];

const nextConfig:NextConfig={
  transpilePackages:["@platform/core","@platform/contracts","@platform/server","@platform/database"],
  poweredByHeader:false,
  async headers(){return [{source:"/:path*",headers:securityHeaders}]},
};
export default nextConfig;
