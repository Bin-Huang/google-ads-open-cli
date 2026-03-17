import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface Credentials {
  access_token: string;
  developer_token: string;
  login_customer_id?: string;
}

const DEFAULT_PATH = join(
  homedir(),
  ".config",
  "google-ads-open-cli",
  "credentials.json"
);

export function loadCredentials(path?: string): Credentials {
  if (path) return JSON.parse(readFileSync(path, "utf-8"));

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
    return JSON.parse(readFileSync(DEFAULT_PATH, "utf-8"));
  }

  throw new Error(
    `No credentials found. Provide one of:\n` +
    `  1. --credentials <path> flag\n` +
    `  2. GOOGLE_ADS_ACCESS_TOKEN and GOOGLE_ADS_DEVELOPER_TOKEN env vars\n` +
    `  3. ${DEFAULT_PATH}`
  );
}
