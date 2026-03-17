import type { Credentials } from "./auth.js";

const BASE_URL = "https://googleads.googleapis.com/v19";

interface CallOptions {
  creds: Credentials;
  path: string;
  params?: Record<string, string>;
}

interface QueryOptions {
  creds: Credentials;
  customerId: string;
  query: string;
}

function buildHeaders(creds: Credentials): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${creds.access_token}`,
    "developer-token": creds.developer_token,
    "Content-Type": "application/json",
  };
  if (creds.login_customer_id) {
    headers["login-customer-id"] = creds.login_customer_id;
  }
  return headers;
}

export async function callApi(opts: CallOptions): Promise<unknown> {
  const url = new URL(`${BASE_URL}/${opts.path}`);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: buildHeaders(opts.creds),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { rawResponse: text };
  }

  if (!res.ok) {
    const err = data as Record<string, unknown>;
    const errObj = err?.error as Record<string, unknown> | undefined;
    const msg = errObj?.message ? String(errObj.message) : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

export async function queryGaql(opts: QueryOptions): Promise<unknown> {
  const url = `${BASE_URL}/customers/${opts.customerId}/googleAds:searchStream`;

  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(opts.creds),
    body: JSON.stringify({ query: opts.query }),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { rawResponse: text };
  }

  if (!res.ok) {
    const err = data as Record<string, unknown>;
    const details = Array.isArray(err) && err[0]?.error;
    const errObj = (details || err?.error) as Record<string, unknown> | undefined;
    const msg = errObj?.message ? String(errObj.message) : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}
