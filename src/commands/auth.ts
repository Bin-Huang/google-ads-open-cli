import { Command } from "commander";
import { createServer } from "node:http";
import { exec } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { DEFAULT_PATH, saveCredentials } from "../auth.js";
import type { Credentials } from "../auth.js";
import { fatal } from "../utils.js";

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

export function registerAuthCommands(program: Command): void {
  const auth = program.command("auth").description("Authentication commands");

  auth
    .command("login")
    .description("Authorize with Google and save OAuth2 credentials")
    .option("--developer-token <token>", "Google Ads developer token")
    .option("--client-id <id>", "OAuth2 client ID")
    .option("--client-secret <secret>", "OAuth2 client secret")
    .option("--port <port>", "Local server port (0 = auto)", "0")
    .option("--no-browser", "Print auth URL instead of opening browser")
    .action(async (opts) => {
      try {
        const credsPath = program.opts().credentials || DEFAULT_PATH;

        let existing: Partial<Credentials> = {};
        if (existsSync(credsPath)) {
          try {
            existing = JSON.parse(readFileSync(credsPath, "utf-8"));
          } catch {}
        }

        const developerToken = opts.developerToken || existing.developer_token;
        const clientId = opts.clientId || existing.client_id;
        const clientSecret = opts.clientSecret || existing.client_secret;

        if (!developerToken || !clientId || !clientSecret) {
          const missing: string[] = [];
          if (!developerToken) missing.push("--developer-token");
          if (!clientId) missing.push("--client-id");
          if (!clientSecret) missing.push("--client-secret");
          fatal(
            `Missing required credentials: ${missing.join(", ")}.\n` +
            `Provide them as flags or in ${credsPath}`
          );
        }

        const tokens = await authorize(clientId, clientSecret, {
          port: parseInt(opts.port),
          openBrowserFn: opts.browser ? openBrowser : undefined,
        });

        const creds: Credentials = {
          ...existing,
          developer_token: developerToken,
          client_id: clientId,
          client_secret: clientSecret,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: tokens.token_expiry,
        } as Credentials;

        saveCredentials(credsPath, creds);
        process.stderr.write(`Credentials saved to ${credsPath}\n`);
      } catch (err) {
        fatal((err as Error).message);
      }
    });
}

interface AuthorizeOptions {
  port: number;
  openBrowserFn?: (url: string) => void;
}

interface TokenResult {
  access_token: string;
  refresh_token: string;
  token_expiry: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function authorize(
  clientId: string,
  clientSecret: string,
  opts: AuthorizeOptions,
): Promise<TokenResult> {
  return new Promise<TokenResult>((resolve, reject) => {
    let done = false;
    let timer: ReturnType<typeof setTimeout>;

    function finish(fn: () => void) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      server.close(() => {});
      fn();
    }

    const server = createServer(async (req, res) => {
      const url = new URL(req.url!, `http://127.0.0.1`);

      if (!url.searchParams.has("code") && !url.searchParams.has("error")) {
        res.writeHead(404);
        res.end();
        return;
      }

      try {
        const error = url.searchParams.get("error");
        if (error) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end("<html><body><h2>Authorization denied.</h2><p>You can close this tab.</p></body></html>");
          finish(() => reject(new Error(`Authorization denied: ${error}`)));
          return;
        }

        const code = url.searchParams.get("code")!;
        const port = (server.address() as { port: number }).port;
        const redirectUri = `http://127.0.0.1:${port}`;

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });

        const data = await tokenRes.json() as Record<string, unknown>;
        if (!tokenRes.ok) {
          const msg = (data.error_description || data.error || `HTTP ${tokenRes.status}`) as string;
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`<html><body><h2>Token exchange failed.</h2><p>${escapeHtml(msg)}</p></body></html>`);
          finish(() => reject(new Error(`Token exchange failed: ${msg}`)));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<html><body><h2>Authorization successful!</h2><p>You can close this tab.</p></body></html>");
        finish(() => resolve({
          access_token: data.access_token as string,
          refresh_token: data.refresh_token as string,
          token_expiry: new Date(Date.now() + (data.expires_in as number) * 1000).toISOString(),
        }));
      } catch (err) {
        try {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Internal error");
        } catch {}
        finish(() => reject(err));
      }
    });

    server.listen(opts.port, "127.0.0.1", () => {
      const port = (server.address() as { port: number }).port;
      const redirectUri = `http://127.0.0.1:${port}`;
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent("https://www.googleapis.com/auth/adwords")}` +
        `&access_type=offline` +
        `&prompt=consent`;

      if (opts.openBrowserFn) {
        process.stderr.write(`Opening browser for authorization...\nIf it doesn't open, visit:\n${authUrl}\n`);
        opts.openBrowserFn(authUrl);
      } else {
        process.stderr.write(`Open this URL in your browser:\n${authUrl}\n`);
      }
    });

    timer = setTimeout(() => {
      finish(() => reject(new Error("Authorization timed out after 120 seconds")));
    }, 120_000);
  });
}
