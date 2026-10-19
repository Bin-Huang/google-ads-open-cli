import type { Credentials } from "./auth.js";
import { normalizeCustomerId } from "./utils.js";

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
    "Content-Type": "application/json",
  };
  // The API ignores developer tokens since 2026-09-09. Send one only if the user still has it.
  if (creds.developer_token) {
    headers["developer-token"] = creds.developer_token;
  }
  if (creds.login_customer_id) {
    headers["login-customer-id"] = normalizeCustomerId(creds.login_customer_id);
  }
  return headers;
}

// Since 2026-09-09 the access level belongs to the Google Cloud project of the OAuth client.
// New projects get Test access, which cannot read production accounts.
const TEST_ACCESS_HINT =
  "Hint: the Google Cloud project of your OAuth client probably has Test access, which only works with test accounts. " +
  "Apply for Explorer access on the Google Ads API Overview page of that project: " +
  "https://console.cloud.google.com/google/ads-apis/overview";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Build an error message from an API error response. The top-level message is
 * often generic ("Request contains an invalid argument."), so the GoogleAdsFailure
 * details (error code + message) are appended.
 * searchStream wraps the error in an array: [{ error: {...} }].
 * The body comes from the network, so every level is checked before use.
 * Malformed details are skipped and the top-level message is kept.
 */
export function formatApiError(data: unknown, status: number): string {
  const body = Array.isArray(data) ? data[0] : data;
  const errObj = isObject(body) && isObject(body.error) ? body.error : undefined;
  const summary = errObj?.message ? String(errObj.message) : `HTTP ${status}`;
  const details: string[] = [];
  const detailList = Array.isArray(errObj?.details) ? errObj.details : [];
  for (const detail of detailList) {
    if (!isObject(detail) || !Array.isArray(detail.errors)) continue;
    for (const e of detail.errors) {
      if (!isObject(e)) continue;
      const code = isObject(e.errorCode) ? Object.values(e.errorCode)[0] : undefined;
      const message = String(e.message ?? "");
      details.push(code ? `${code}: ${message}` : message);
    }
  }
  const message = details.length ? `${summary} - ${details.join("; ")}` : summary;
  return /ACTION_NOT_PERMITTED|CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION|only approved for use with test accounts/i.test(message)
    ? `${message}\n${TEST_ACCESS_HINT}`
    : message;
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
