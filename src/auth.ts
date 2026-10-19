import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

export interface Credentials {
  access_token: string;
  // Optional: Google stopped checking developer tokens on 2026-09-09.
  developer_token?: string;
  login_customer_id?: string;
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  token_expiry?: string;
}

export const DEFAULT_PATH = join(
  homedir(),
  ".config",
  "google-ads-open-cli",
  "credentials.json"
);

export function saveCredentials(path: string, creds: Credentials): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify(creds, null, 2) + "\n", { encoding: "utf-8", mode: 0o600 });
  // mode only applies when the file is created; tighten pre-existing files too.
  // This is best-effort: chmod fails with EPERM when another user owns the file,
  // and the credentials are already written at this point.
  try {
    chmodSync(path, 0o600);
  } catch {
    // keep the existing permissions
  }
}

function isTokenExpired(creds: Credentials): boolean {
  if (!creds.access_token || !creds.token_expiry) return true;
  return Date.now() >= new Date(creds.token_expiry).getTime() - 60_000;
}

async function refreshAccessToken(creds: Credentials): Promise<{ access_token: string; token_expiry: string }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.client_id!,
      client_secret: creds.client_secret!,
      refresh_token: creds.refresh_token!,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    const msg = (data.error_description || data.error || `HTTP ${res.status}`) as string;
    throw new Error(
      `Token refresh failed: ${msg}. The refresh token may be expired or revoked. ` +
      `If the OAuth app is in Testing status, refresh tokens expire after 7 days. ` +
      `Run "google-ads-open-cli auth login" to sign in again.`
    );
  }

  return {
    access_token: data.access_token as string,
    token_expiry: new Date(Date.now() + (data.expires_in as number) * 1000).toISOString(),
  };
}

function canRefresh(creds: Credentials): boolean {
  return !!(creds.refresh_token && creds.client_id && creds.client_secret);
}

function readCredentialsFile(path: string): Credentials {
  if (!existsSync(path)) {
    throw new Error(
      `Credentials file not found: ${path}. ` +
      `Run "google-ads-open-cli --credentials ${path} auth login" to create it, or fix the path.`
    );
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

/** Read credentials from GOOGLE_ADS_* env vars. Returns undefined when none are set. */
function credentialsFromEnv(): Credentials | undefined {
  const env = process.env;
  const base = {
    developer_token: env.GOOGLE_ADS_DEVELOPER_TOKEN || undefined,
    login_customer_id: env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined,
  };

  const refreshVars = ["GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET"];
  const missing = refreshVars.filter((name) => !env[name]);
  if (missing.length === 0) {
    return {
      ...base,
      access_token: "",
      refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN,
      client_id: env.GOOGLE_ADS_CLIENT_ID,
      client_secret: env.GOOGLE_ADS_CLIENT_SECRET,
    };
  }
  if (missing.length < refreshVars.length) {
    throw new Error(`Incomplete environment credentials. Also set: ${missing.join(", ")}`);
  }

  if (env.GOOGLE_ADS_ACCESS_TOKEN) {
    return { ...base, access_token: env.GOOGLE_ADS_ACCESS_TOKEN };
  }
  return undefined;
}

export async function loadCredentials(path?: string): Promise<Credentials> {
  let creds: Credentials;
  let sourcePath: string | undefined;

  if (path) {
    creds = readCredentialsFile(path);
    sourcePath = path;
  } else {
    const envCreds = credentialsFromEnv();
    if (envCreds) {
      creds = envCreds;
    } else if (existsSync(DEFAULT_PATH)) {
      creds = readCredentialsFile(DEFAULT_PATH);
      sourcePath = DEFAULT_PATH;
    } else {
      throw new Error(
        `No credentials found. Run "google-ads-open-cli auth login" to sign in, or provide one of:\n` +
        `  1. --credentials <path> flag\n` +
        `  2. GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET env vars\n` +
        `  3. GOOGLE_ADS_ACCESS_TOKEN env var (expires after about 1 hour)\n` +
        `  4. ${DEFAULT_PATH}`
      );
    }
  }

  if (canRefresh(creds) && isTokenExpired(creds)) {
    const refreshed = await refreshAccessToken(creds);
    creds.access_token = refreshed.access_token;
    creds.token_expiry = refreshed.token_expiry;
    if (sourcePath) {
      saveCredentials(sourcePath, creds);
    }
  }

  if (!creds.access_token) {
    throw new Error(
      `Credentials file is missing required fields. Run "google-ads-open-cli auth login" to set up.`
    );
  }

  return creds;
}
