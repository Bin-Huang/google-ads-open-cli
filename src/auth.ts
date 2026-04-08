import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

export interface Credentials {
  access_token: string;
  developer_token: string;
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
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(creds, null, 2) + "\n", "utf-8");
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
    throw new Error(`Token refresh failed: ${msg}`);
  }

  return {
    access_token: data.access_token as string,
    token_expiry: new Date(Date.now() + (data.expires_in as number) * 1000).toISOString(),
  };
}

function canRefresh(creds: Credentials): boolean {
  return !!(creds.refresh_token && creds.client_id && creds.client_secret);
}

export async function loadCredentials(path?: string): Promise<Credentials> {
  let creds: Credentials;
  let sourcePath: string | undefined;

  if (path) {
    creds = JSON.parse(readFileSync(path, "utf-8"));
    sourcePath = path;
  } else {
    const accessToken = process.env.GOOGLE_ADS_ACCESS_TOKEN;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    if (accessToken && developerToken) {
      return {
        access_token: accessToken,
        developer_token: developerToken,
        login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
      };
    }

    if (existsSync(DEFAULT_PATH)) {
      creds = JSON.parse(readFileSync(DEFAULT_PATH, "utf-8"));
      sourcePath = DEFAULT_PATH;
    } else {
      throw new Error(
        `No credentials found. Provide one of:\n` +
        `  1. --credentials <path> flag\n` +
        `  2. GOOGLE_ADS_ACCESS_TOKEN and GOOGLE_ADS_DEVELOPER_TOKEN env vars\n` +
        `  3. ${DEFAULT_PATH}`
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

  if (!creds.access_token || !creds.developer_token) {
    throw new Error(
      `Credentials file is missing required fields. Run "google-ads-open-cli auth login" to set up.`
    );
  }

  return creds;
}
