export type RetryPolicy = Readonly<{
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
  shouldRetry: (error: unknown) => boolean;
}>;

const DEFAULT_POLICY: RetryPolicy = {
  attempts: 4,
  baseDelayMs: 20,
  maxDelayMs: 250,
  jitterRatio: 0.35,
  shouldRetry: isSerializationConflict,
};

export async function withRetry<T>(operation: (attempt: number) => Promise<T>, policy: Partial<RetryPolicy> = {}): Promise<T> {
  const resolved: RetryPolicy = {...DEFAULT_POLICY, ...policy};
  let lastError: unknown;
  for (let attempt = 1; attempt <= resolved.attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= resolved.attempts || !resolved.shouldRetry(error)) throw error;
      await sleep(backoffDelay(attempt, resolved));
    }
  }
  throw lastError;
}

export function isSerializationConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as {code?: unknown}).code === "P2034";
}

export function isTransientDatabaseFailure(error: unknown): boolean {
  if (isSerializationConflict(error)) return true;
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return ["P1001", "P1002", "P1008", "P1017", "57P01", "40001", "40P01"].includes(String((error as {code?: unknown}).code ?? ""));
}

function backoffDelay(attempt: number, policy: RetryPolicy): number {
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** Math.max(0, attempt - 1));
  const jitter = exponential * policy.jitterRatio * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(exponential + jitter));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
