import type { Credentials } from "./auth.js";

const BASE_URL = "https://googleads.googleapis.com/v23";

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

interface GoogleAdsError {
  errorCode?: Record<string, string>;
  message?: string;
}

interface ApiErrorBody {
  message?: string;
  details?: { errors?: GoogleAdsError[] }[];
}

/**
 * Build an error message from an API error response. The top-level message is
 * often generic ("Request contains an invalid argument."), so the GoogleAdsFailure
 * details (error code + message) are appended.
 * searchStream wraps the error in an array: [{ error: {...} }].
 */
function formatApiError(data: unknown, status: number): string {
  const body = (Array.isArray(data) ? data[0] : data) as { error?: ApiErrorBody } | undefined;
  const errObj = body?.error;
  const summary = errObj?.message ? String(errObj.message) : `HTTP ${status}`;
  const details: string[] = [];
  for (const detail of errObj?.details ?? []) {
    for (const e of detail.errors ?? []) {
      const code = Object.values(e.errorCode ?? {})[0];
      details.push(code ? `${code}: ${e.message ?? ""}` : String(e.message ?? ""));
    }
  }
  return details.length ? `${summary} - ${details.join("; ")}` : summary;
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
    throw new Error(formatApiError(data, res.status));
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
    throw new Error(formatApiError(data, res.status));
  }

  return data;
}
