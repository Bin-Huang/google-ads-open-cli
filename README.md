# google-ads-open-cli

Google Ads CLI & Skills for AI agents (and humans). Run custom GAQL queries, pull campaign and keyword stats, navigate MCC account hierarchies, audit conversion tracking, and more.

**Works with:** OpenClaw, Claude Code, Cursor, Codex, and any agent that can run shell commands.

## Installation

Tell your AI agent (e.g. OpenClaw):

> Install this CLI and skills from https://github.com/Bin-Huang/google-ads-open-cli

Or install manually:

```bash
npm install -g google-ads-open-cli

# Add skills for AI agents (Claude Code, Cursor, Codex, etc.)
npx skills add Bin-Huang/google-ads-open-cli
```

Or run directly: `npx google-ads-open-cli --help`

## How it works

Built on the official [Google Ads API v23](https://developers.google.com/google-ads/api/docs/start) with GAQL (Google Ads Query Language), this CLI authenticates via OAuth2 user credentials, providing read-only access to the Google Ads API.

Core endpoints covered:

- **Customer accounts** -- list accessible accounts, inspect individual customers, browse MCC hierarchies
- **Campaigns & budgets** -- list campaigns with status filtering, inspect campaign budgets
- **Ad groups & ads** -- browse ad groups and ads with campaign/status filters
- **Keywords** -- list keywords (ad group criteria) with filtering
- **Performance stats** -- campaign, ad group, ad, and keyword-level stats with date ranges and segment breakdowns
- **Audiences & user lists** -- campaign audience performance and remarketing lists
- **Assets & extensions** -- images, videos, sitelinks, and campaign-level asset links
- **Conversions & billing** -- conversion actions, billing setup, account budgets
- **GAQL query** -- run arbitrary Google Ads Query Language queries for any data not covered by built-in commands
- **Change history** -- recent change status records

## Setup

You need a Google Cloud project with an OAuth client. Since September 9, 2026, the Google Ads API no longer checks developer tokens. Your access level now belongs to the Google Cloud project that owns the OAuth client.

### 1. Create an OAuth client

1. In your Google Cloud project, enable the [Google Ads API](https://console.cloud.google.com/apis/library/googleads.googleapis.com).
2. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview) and configure the OAuth consent screen:
   - **Branding**: set an app name and a support email.
   - **Audience**: choose **External** (or **Internal** for a Google Workspace organization). While the app is in **Testing** status, add your own Google account under **Test users**.
   - **Data Access**: add the scope `https://www.googleapis.com/auth/adwords`.
3. Under **Clients**, create an OAuth client with the type **Desktop app**. Copy the client ID and the client secret.

### 2. Apply for an access level

A new Cloud project has **Test** access. Test access works only with [test accounts](https://developers.google.com/google-ads/api/docs/best-practices/test-accounts). To read real (production) accounts, apply for **Explorer** access on the [Google Ads API Overview page](https://console.cloud.google.com/google/ads-apis/overview) of the same Cloud project. **Basic** access needs [brand verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification) before you apply. Applications made in the Google Ads API Center are no longer processed.

With Test access, calls to a production account fail with `ACTION_NOT_PERMITTED` (API v24 and earlier, including the v23 that this CLI uses) or `CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION` (v25 and later). `customers` still succeeds with Test access, so use `customer <id>` to check your access.

Known issues (October 2026, see [Google's developer token page](https://developers.google.com/google-ads/api/docs/api-policy/developer-token)):

- Some applications are rejected even after brand verification. Google says the cause can be a project on the free trial, or a project with a suspended or disabled billing account.
- Some projects upgraded after September 9, 2026 still get `AUTHORIZATION_ERROR`. Google's workaround is to apply for Explorer access with a new Cloud project.
- Several users report that Explorer applications for new projects are rejected within seconds ([googleads/google-ads-mcp#133](https://github.com/googleads/google-ads-mcp/issues/133)).

### 3. Sign in

```bash
google-ads-open-cli auth login --client-id=xxx --client-secret=xxx
```

This opens your browser for Google authorization and waits up to 120 seconds. Sign in with a Google account that has access to the Google Ads data you want to use. After you approve, credentials are saved to `~/.config/google-ads-open-cli/credentials.json`, and all later commands use them.

Options:

- `--login-customer-id <id>`: the manager (MCC) account ID, when you access client accounts through a manager account. Dashes are stripped.
- `--no-browser`: print the authorization URL instead of opening a browser.
- `--port <port>`: the port of the local callback server (default: a random free port).
- `--developer-token <token>`: optional. The API ignores it, but the CLI still sends it if you set one.

Then check your access with a real account:

```bash
google-ads-open-cli customer 1234567890
```

The CLI refreshes the access token automatically. While the OAuth app has the **External** audience and is in **Testing** status, Google [expires the refresh token after 7 days](https://developers.google.com/identity/protocols/oauth2#expiration). After that, commands fail with `Token refresh failed`, and you must run `auth login` again. To remove this limit, set the app's publishing status to **In production** in Google Auth Platform. Google can require app verification for that.

### Remote machines (SSH)

The callback server listens on `127.0.0.1` of the machine that runs the CLI, so the browser must reach that address. On a remote machine, choose a fixed port and forward it over SSH:

```bash
# On your local machine
ssh -L 8085:127.0.0.1:8085 user@remote-host

# In that SSH session
google-ads-open-cli auth login --client-id=xxx --client-secret=xxx --port 8085 --no-browser
```

Open the printed URL in your local browser. Google redirects to `http://127.0.0.1:8085`, and SSH forwards the request to the remote CLI. You can also run `auth login` locally and copy `credentials.json` to the remote machine.

### Service accounts

The Google Ads API supports service accounts, but this CLI currently supports only OAuth user credentials.

### Alternative: Environment variables

For CI/CD or automation, set a refresh token and the OAuth client. The CLI gets a new access token on each run:

```bash
export GOOGLE_ADS_REFRESH_TOKEN="your_refresh_token"   # from credentials.json after auth login
export GOOGLE_ADS_CLIENT_ID="your_client_id"
export GOOGLE_ADS_CLIENT_SECRET="your_client_secret"
export GOOGLE_ADS_LOGIN_CUSTOMER_ID="1234567890"       # optional, for MCC accounts
```

The 7-day limit of Testing status also applies to this refresh token.

You can also set only `GOOGLE_ADS_ACCESS_TOKEN`. An access token expires after about 1 hour, and the CLI cannot refresh it. `GOOGLE_ADS_DEVELOPER_TOKEN` is optional.

The CLI reads credentials in this order: the `--credentials` flag, the refresh token env vars, `GOOGLE_ADS_ACCESS_TOKEN`, then `~/.config/google-ads-open-cli/credentials.json`. If you set only some of the three refresh token env vars, the CLI exits with an error that names the missing ones. The official Google Ads client libraries read the same variable names, so if you already set them for a library, the CLI uses them instead of `credentials.json`. `GOOGLE_ADS_LOGIN_CUSTOMER_ID` and `GOOGLE_ADS_DEVELOPER_TOKEN` apply only to env var credentials.

## Entity hierarchy

Google Ads uses this hierarchy:

```
Manager Account (MCC)
 └── Customer Account (1234567890)
      ├── Campaign
      │    └── Ad Group
      │         ├── Ad (Ad Group Ad)
      │         └── Keyword (Ad Group Criterion)
      ├── Campaign Budget
      ├── Conversion Action
      ├── User List (remarketing)
      └── Asset (images, videos, sitelinks, etc.)
```

Customer IDs are 10-digit numbers (e.g., `1234567890`). Dashes are stripped automatically.

## Monetary values

Google Ads uses **micros**: 1 dollar = 1,000,000 micros. All cost/bid/budget values are in micros. Divide by 1,000,000 for the actual amount.

## Usage

All commands output pretty-printed JSON by default. Use `--format compact` for single-line JSON.

### customers

List accessible customer accounts.

```bash
google-ads-open-cli customers
```

### customer

Get a specific customer account.

```bash
google-ads-open-cli customer 1234567890
```

### account-hierarchy

List manager account hierarchy (sub-accounts under an MCC).

```bash
google-ads-open-cli account-hierarchy 1234567890
```

### campaigns

List campaigns for a customer account.

```bash
google-ads-open-cli campaigns 1234567890
google-ads-open-cli campaigns 1234567890 --status ENABLED
```

Options:
- `--status <status>`: filter by status (ENABLED, PAUSED, REMOVED)
- `--limit <n>`: max results (default 100)

### campaign

Get a specific campaign.

```bash
google-ads-open-cli campaign 1234567890 98765
```

### campaign-budgets

List campaign budgets.

```bash
google-ads-open-cli campaign-budgets 1234567890
```

Options:
- `--limit <n>`: max results (default 100)

### ad-groups

List ad groups.

```bash
google-ads-open-cli ad-groups 1234567890
google-ads-open-cli ad-groups 1234567890 --campaign 98765
```

Options:
- `--campaign <id>`: filter by campaign ID
- `--status <status>`: filter by status (ENABLED, PAUSED, REMOVED)
- `--limit <n>`: max results (default 100)

### ad-group

Get a specific ad group.

```bash
google-ads-open-cli ad-group 1234567890 11111
```

### ads

List ads.

```bash
google-ads-open-cli ads 1234567890
google-ads-open-cli ads 1234567890 --campaign 98765 --ad-group 11111
```

Options:
- `--campaign <id>`: filter by campaign ID
- `--ad-group <id>`: filter by ad group ID
- `--status <status>`: filter by status (ENABLED, PAUSED, REMOVED)
- `--limit <n>`: max results (default 100)

### ad

Get a specific ad.

```bash
google-ads-open-cli ad 1234567890 11111 22222
```

### campaign-stats

Get campaign performance stats.

```bash
google-ads-open-cli campaign-stats 1234567890 --start 2026-01-01 --end 2026-01-31
google-ads-open-cli campaign-stats 1234567890 --start 2026-01-01 --end 2026-01-31 --campaign 98765 --segments device
```

Options:
- `--start <date>`: start date (YYYY-MM-DD) **required**
- `--end <date>`: end date (YYYY-MM-DD) **required**
- `--campaign <id>`: filter by campaign ID
- `--segments <segs>`: additional segments (comma-separated, e.g. device, ad_network_type, day_of_week)
- `--limit <n>`: max results (default 1000)

Rows are sorted by date, newest first. `ad-group-stats` and `ad-stats` use the same order. `keyword-stats` sorts by impressions, highest first. For all four stats commands, if the row count reaches `--limit`, a JSON warning is written to stderr because the results are probably truncated.

Default metrics: impressions, clicks, cost_micros, conversions, conversions_value, ctr, average_cpc, average_cpm, interactions, all_conversions

### ad-group-stats

Get ad group performance stats.

```bash
google-ads-open-cli ad-group-stats 1234567890 --start 2026-01-01 --end 2026-01-31
```

Options:
- `--start <date>`: start date (YYYY-MM-DD) **required**
- `--end <date>`: end date (YYYY-MM-DD) **required**
- `--campaign <id>`: filter by campaign ID
- `--ad-group <id>`: filter by ad group ID
- `--limit <n>`: max results (default 1000)

### ad-stats

Get ad-level performance stats.

```bash
google-ads-open-cli ad-stats 1234567890 --start 2026-01-01 --end 2026-01-31
```

Options: same as `ad-group-stats`.

### keyword-stats

Get keyword-level performance stats (sorted by impressions desc).

```bash
google-ads-open-cli keyword-stats 1234567890 --start 2026-01-01 --end 2026-01-31
```

Options: same as `ad-group-stats`.

### keywords

List keywords (ad group criteria).

```bash
google-ads-open-cli keywords 1234567890
google-ads-open-cli keywords 1234567890 --campaign 98765 --status ENABLED
```

Options:
- `--campaign <id>`: filter by campaign ID
- `--ad-group <id>`: filter by ad group ID
- `--status <status>`: filter by status (ENABLED, PAUSED, REMOVED)
- `--limit <n>`: max results (default 100)

### audiences

List audience segments.

```bash
google-ads-open-cli audiences 1234567890
```

Options:
- `--limit <n>`: max results (default 100)

### user-lists

List remarketing/user lists.

```bash
google-ads-open-cli user-lists 1234567890
```

Options:
- `--limit <n>`: max results (default 100)

### negative-keywords

List shared negative keyword lists.

```bash
google-ads-open-cli negative-keywords 1234567890
```

Options:
- `--limit <n>`: max results (default 100)

### assets

List assets (images, videos, text, sitelinks, etc.).

```bash
google-ads-open-cli assets 1234567890
google-ads-open-cli assets 1234567890 --type SITELINK
```

Options:
- `--type <type>`: filter by type (IMAGE, MEDIA_BUNDLE, TEXT, YOUTUBE_VIDEO, LEAD_FORM, CALL, CALLOUT, SITELINK, STRUCTURED_SNIPPET)
- `--limit <n>`: max results (default 100)

### extensions

List ad extensions (campaign-level asset links).

```bash
google-ads-open-cli extensions 1234567890
google-ads-open-cli extensions 1234567890 --campaign 98765
```

Options:
- `--campaign <id>`: filter by campaign ID
- `--limit <n>`: max results (default 100)

### conversion-actions

List conversion actions.

```bash
google-ads-open-cli conversion-actions 1234567890
```

Options:
- `--limit <n>`: max results (default 100)

### query

Run a raw GAQL (Google Ads Query Language) query. This is the escape hatch for any data not covered by built-in commands.

```bash
google-ads-open-cli query 1234567890 "SELECT campaign.id, campaign.name, metrics.clicks FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.clicks DESC LIMIT 10"
```

See [GAQL reference](https://developers.google.com/google-ads/api/docs/query/overview) for syntax.

### billing

Get billing setup and account budget info.

```bash
google-ads-open-cli billing 1234567890
```

### change-status

Get recent change history.

```bash
google-ads-open-cli change-status 1234567890
google-ads-open-cli change-status 1234567890 --days 30 --limit 200
```

Options:
- `--days <n>`: look back this many days, including today (default 14, max 90; the API does not keep older change status data)
- `--limit <n>`: max results (default 50, max 10000)

The date range uses this machine's local date, but Google Ads reads it in the account's time zone. That time zone can be one day ahead. To cover this, the range ends two days after today, so it always includes today's changes in the account's time zone. The range starts at most 88 days before today, so it stays inside the API's 90-day limit. As a result, `--days 89` and `--days 90` query the same range.

## Error output

All errors are JSON to stderr:

```json
{"error": "No credentials found. Run \"google-ads-open-cli auth login\" to sign in, or provide one of: ..."}
```

API errors include the Google Ads error code and detail message when the API returns them:

```json
{"error": "Request contains an invalid argument. - UNRECOGNIZED_FIELD: Unrecognized field in the query: 'campaign.foo'."}
```

## API Reference

- [Google Ads API Overview](https://developers.google.com/google-ads/api/docs/start)
- [GAQL Reference](https://developers.google.com/google-ads/api/docs/query/overview)
- [Resource Reference](https://developers.google.com/google-ads/api/fields/v23/overview)

## Related

- [meta-ads-open-cli](https://github.com/Bin-Huang/meta-ads-open-cli) -- Meta Ads CLI & Skills for AI agents (and humans)
- [microsoft-ads-cli](https://github.com/Bin-Huang/microsoft-ads-cli) -- Microsoft Ads CLI & Skills for AI agents (and humans)
- [amazon-ads-open-cli](https://github.com/Bin-Huang/amazon-ads-open-cli) -- Amazon Ads CLI & Skills for AI agents (and humans)
- [tiktok-ads-cli](https://github.com/Bin-Huang/tiktok-ads-cli) -- TikTok Ads CLI & Skills for AI agents (and humans)
- [linkedin-ads-cli](https://github.com/Bin-Huang/linkedin-ads-cli) -- LinkedIn Ads CLI & Skills for AI agents (and humans)
- [x-ads-cli](https://github.com/Bin-Huang/x-ads-cli) -- X Ads CLI & Skills for AI agents (and humans)
- [snapchat-ads-cli](https://github.com/Bin-Huang/snapchat-ads-cli) -- Snapchat Ads CLI & Skills for AI agents (and humans)
- [pinterest-ads-cli](https://github.com/Bin-Huang/pinterest-ads-cli) -- Pinterest Ads CLI & Skills for AI agents (and humans)
- [reddit-ads-cli](https://github.com/Bin-Huang/reddit-ads-cli) -- Reddit Ads CLI & Skills for AI agents (and humans)
- [spotify-ads-cli](https://github.com/Bin-Huang/spotify-ads-cli) -- Spotify Ads CLI & Skills for AI agents (and humans)
- [apple-ads-cli](https://github.com/Bin-Huang/apple-ads-cli) -- Apple Ads CLI & Skills for AI agents (and humans)
- [google-analytics-cli](https://github.com/Bin-Huang/google-analytics-cli) -- Google Analytics CLI & Skills for AI agents (and humans)
- [google-search-console-cli](https://github.com/Bin-Huang/google-search-console-cli) -- Google Search Console CLI & Skills for AI agents (and humans)
- [youtube-analytics-cli](https://github.com/Bin-Huang/youtube-analytics-cli) -- YouTube Analytics CLI & Skills for AI agents (and humans)
- [x-analytics-cli](https://github.com/Bin-Huang/x-analytics-cli) -- X Analytics CLI & Skills for AI agents (and humans)
- [camoufox-cli](https://github.com/Bin-Huang/camoufox-cli) -- Anti-detect browser CLI & Skills for AI agents
## License

Apache-2.0
