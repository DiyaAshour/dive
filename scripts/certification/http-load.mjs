import {performance} from "node:perf_hooks";

const url = required("LOAD_URL");
const concurrency = integer("LOAD_CONCURRENCY", 20, 1, 500);
const requests = integer("LOAD_REQUESTS", 1000, 1, 100_000);
const timeoutMs = integer("LOAD_TIMEOUT_MS", 10_000, 100, 120_000);
const expectedStatus = integer("LOAD_EXPECTED_STATUS", 200, 100, 599);

const latencies = [];
let successes = 0;
let failures = 0;
let next = 0;
const startedAt = performance.now();

await Promise.all(Array.from({length:concurrency}, async () => {
  while (true) {
    const index = next++;
    if (index >= requests) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const began = performance.now();
    try {
      const response = await fetch(url,{signal:controller.signal,headers:{"user-agent":"handmekey-load-certification/1"}});
      await response.arrayBuffer();
      latencies.push(performance.now()-began);
      if (response.status===expectedStatus) successes+=1;
      else failures+=1;
    } catch {
      latencies.push(performance.now()-began);
      failures+=1;
    } finally {
      clearTimeout(timer);
    }
  }
}));

const durationMs = performance.now()-startedAt;
latencies.sort((a,b)=>a-b);
const report = {
  url,
  requests,
  concurrency,
  successes,
  failures,
  errorRate: failures/requests,
  durationMs:Math.round(durationMs),
  requestsPerSecond:Number((requests/(durationMs/1000)).toFixed(2)),
  p50Ms:percentile(latencies,0.50),
  p95Ms:percentile(latencies,0.95),
  p99Ms:percentile(latencies,0.99),
  maxMs:Math.round(latencies.at(-1)??0),
};
console.log(JSON.stringify(report,null,2));

const maxErrorRate = number("LOAD_MAX_ERROR_RATE",0.005,0,1);
const maxP99Ms = integer("LOAD_MAX_P99_MS",1500,1,120_000);
if (report.errorRate > maxErrorRate || report.p99Ms > maxP99Ms) {
  console.error(`[load-certification] failed: errorRate=${report.errorRate}, p99Ms=${report.p99Ms}`);
  process.exitCode=1;
}

function percentile(values,p){if(!values.length)return 0;return Math.round(values[Math.min(values.length-1,Math.max(0,Math.ceil(values.length*p)-1))]);}
function required(name){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required`);return value;}
function integer(name,fallback,min,max){const value=Number(process.env[name]??fallback);if(!Number.isInteger(value)||value<min||value>max)throw new Error(`${name} must be an integer between ${min} and ${max}`);return value;}
function number(name,fallback,min,max){const value=Number(process.env[name]??fallback);if(!Number.isFinite(value)||value<min||value>max)throw new Error(`${name} must be between ${min} and ${max}`);return value;}
