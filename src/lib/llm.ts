// src/lib/llm.ts
export type Followup = { question: string; why: string };

// If you want to override via Vite, set VITE_PROXY_BASE; otherwise hardcode:
const PROXY_BASE =
  // @ts-ignore
  (import.meta?.env?.VITE_PROXY_BASE as string) ||
  "https://triage-proxy.vercel.app";

// Resolve correct path on GitHub Pages (subpath deployments)
const BASE_URL =
  // @ts-ignore
  (import.meta?.env?.BASE_URL as string) || "/";

let historyCache: any | null = null;
export async function loadPatientHistory(): Promise<any> {
  if (historyCache) return historyCache;
  try {
    const r = await fetch(`${BASE_URL}patient_history.json`, { cache: "no-store" });
    historyCache = r.ok ? await r.json() : {};
  } catch {
    historyCache = {};
  }
  return historyCache;
}

export async function requestFollowup(symptomText: string, history: any): Promise<Followup | null> {
  const r = await fetch(`${PROXY_BASE}/api/followup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symptom: symptomText, history })
  });
  if (!r.ok) throw new Error(await r.text());

  const data = await r.json();
  const question = String(data?.question || "").trim();
  const why = String(data?.why || "").trim();
  return question ? { question, why } : null;
}
