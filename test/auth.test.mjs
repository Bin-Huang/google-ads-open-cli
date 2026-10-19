import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// DEFAULT_PATH is computed from HOME at import time, so use an empty HOME.
process.env.HOME = mkdtempSync(join(tmpdir(), "gads-test-"));
const { loadCredentials } = await import("../dist/auth.js");
const { callApi, formatApiError } = await import("../dist/api.js");

const ENV_VARS = [
  "GOOGLE_ADS_ACCESS_TOKEN",
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
  "GOOGLE_ADS_REFRESH_TOKEN",
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
];

const realFetch = globalThis.fetch;
let requests;

function mockFetch(status, body) {
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status });
  };
}

beforeEach(() => {
  for (const name of ENV_VARS) delete process.env[name];
  requests = [];
  globalThis.fetch = realFetch;
});

test("no credentials: error points to auth login", async () => {
  await assert.rejects(loadCredentials(), /Run "google-ads-open-cli auth login"/);
});

test("--credentials with a missing file: readable error", async () => {
  await assert.rejects(loadCredentials("/nonexistent/creds.json"), (err) => {
    assert.match(err.message, /Credentials file not found: \/nonexistent\/creds.json/);
    assert.doesNotMatch(err.message, /ENOENT/);
    return true;
  });
});

test("--credentials with a malformed file: error names the file", async () => {
  const path = join(process.env.HOME, "bad.json");
  writeFileSync(path, "{bad");
  await assert.rejects(loadCredentials(path), new RegExp(`Cannot read credentials file ${path}: `));
});

test("GOOGLE_ADS_ACCESS_TOKEN works without a developer token", async () => {
  process.env.GOOGLE_ADS_ACCESS_TOKEN = "at";
  const creds = await loadCredentials();
  assert.equal(creds.access_token, "at");
  assert.equal(creds.developer_token, undefined);
});

test("refresh token env vars: CLI refreshes the access token", async () => {
  process.env.GOOGLE_ADS_REFRESH_TOKEN = "rt";
  process.env.GOOGLE_ADS_CLIENT_ID = "cid";
  process.env.GOOGLE_ADS_CLIENT_SECRET = "cs";
  process.env.GOOGLE_ADS_ACCESS_TOKEN = "stale";
  mockFetch(200, { access_token: "fresh", expires_in: 3600 });

  const creds = await loadCredentials();
  assert.equal(creds.access_token, "fresh");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://oauth2.googleapis.com/token");
  const body = new URLSearchParams(requests[0].init.body);
  assert.equal(body.get("refresh_token"), "rt");
  assert.equal(body.get("client_id"), "cid");
});

test("refresh token env vars: missing ones are named", async () => {
  process.env.GOOGLE_ADS_REFRESH_TOKEN = "rt";
  await assert.rejects(loadCredentials(), /GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET/);
});

test("refresh failure: error mentions 7-day expiry and auth login", async () => {
  process.env.GOOGLE_ADS_REFRESH_TOKEN = "rt";
  process.env.GOOGLE_ADS_CLIENT_ID = "cid";
  process.env.GOOGLE_ADS_CLIENT_SECRET = "cs";
  mockFetch(400, { error: "invalid_grant", error_description: "Token has been expired or revoked." });

  await assert.rejects(loadCredentials(), (err) => {
    assert.match(err.message, /Token refresh failed: Token has been expired or revoked\. - /);
    assert.match(err.message, /7 days/);
    assert.match(err.message, /auth login/);
    return true;
  });
});

test("refresh failure with a bad OAuth client: no 7-day hint", async () => {
  process.env.GOOGLE_ADS_REFRESH_TOKEN = "rt";
  process.env.GOOGLE_ADS_CLIENT_ID = "cid";
  process.env.GOOGLE_ADS_CLIENT_SECRET = "cs";
  mockFetch(401, { error: "invalid_client", error_description: "The OAuth client was not found." });

  await assert.rejects(loadCredentials(), (err) => {
    assert.match(err.message, /Check the OAuth client ID and client secret/);
    assert.doesNotMatch(err.message, /7 days/);
    return true;
  });
});

test("API request without a developer token omits the header", async () => {
  mockFetch(200, {});
  await callApi({ creds: { access_token: "at" }, path: "customers:listAccessibleCustomers" });
  assert.equal(requests[0].init.headers["developer-token"], undefined);
  assert.equal(requests[0].init.headers.Authorization, "Bearer at");
});

test("API request with a developer token still sends it", async () => {
  mockFetch(200, {});
  await callApi({
    creds: { access_token: "at", developer_token: "dt", login_customer_id: "123-456-7890" },
    path: "customers:listAccessibleCustomers",
  });
  assert.equal(requests[0].init.headers["developer-token"], "dt");
  assert.equal(requests[0].init.headers["login-customer-id"], "1234567890");
});

test("Test access errors get a hint to apply for Explorer access", () => {
  const body = (code) => [{
    error: {
      message: "The caller does not have permission",
      details: [{ errors: [{ errorCode: { authorizationError: code }, message: "x" }] }],
    },
  }];
  for (const code of ["ACTION_NOT_PERMITTED", "CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION"]) {
    assert.match(formatApiError(body(code), 403), /Apply for Explorer access/);
  }
  assert.doesNotMatch(formatApiError(body("USER_PERMISSION_DENIED"), 403), /Explorer/);
});
