# google-ads-open-cli

Google Ads CLI for AI agents (and humans). Run custom GAQL queries, pull campaign and keyword stats, navigate MCC account hierarchies, audit conversion tracking, and more.

**Works with:** OpenClaw, Claude Code, Cursor, Codex, and any agent that can run shell commands.

## Installation

Tell your AI agent (e.g. OpenClaw):

> Install the CLI and skills from https://github.com/Bin-Huang/google-ads-open-cli

Or install manually:

```bash
npm install -g google-ads-open-cli

# Add skills for AI agents (Claude Code, Cursor, Codex, etc.)
npx skills add Bin-Huang/google-ads-open-cli
```

Or run directly: `npx google-ads-open-cli --help`

## How it works

Built on the official [Google Ads API v23](https://developers.google.com/google-ads/api/docs/start) with GAQL (Google Ads Query Language), this CLI authenticates via an OAuth2 access token and developer token (set as environment variables, a credentials file, or per-command flag) and provides read-only access to the Google Ads API.

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

### Option 1: Environment variables

```bash
export GOOGLE_ADS_ACCESS_TOKEN="your_oauth2_access_token"
export GOOGLE_ADS_DEVELOPER_TOKEN="your_developer_token"
export GOOGLE_ADS_LOGIN_CUSTOMER_ID="1234567890"  # optional, for MCC accounts
```

### Option 2: Credentials file

Create `~/.config/google-ads-open-cli/credentials.json`:

```json
{
  "access_token": "your_oauth2_access_token",
  "developer_token": "your_developer_token",
  "login_customer_id": "1234567890"
}
```

### Option 3: Per-command credentials

```bash
google-ads-open-cli customers --credentials /path/to/creds.json
```

Credentials are resolved in this order:
1. `--credentials <path>` flag
2. `GOOGLE_ADS_ACCESS_TOKEN` + `GOOGLE_ADS_DEVELOPER_TOKEN` env vars
3. `~/.config/google-ads-open-cli/credentials.json` (auto-detected)

### What you need

1. **Developer Token** -- Apply at [Google Ads API Center](https://ads.google.com/aw/apicenter). Basic access is sufficient for read-only.
2. **OAuth2 Access Token** -- Use Google OAuth2 flow with scope `https://www.googleapis.com/auth/adwords`
3. **Login Customer ID** (optional) -- Required when accessing accounts via a Manager (MCC) account. Use the MCC's customer ID (no dashes).

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
- `--status <status>` -- filter by status: ENABLED, PAUSED, REMOVED
- `--limit <n>` -- max results (default 100)

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
- `--limit <n>` -- max results (default 100)

### ad-groups

List ad groups.

```bash
google-ads-open-cli ad-groups 1234567890
google-ads-open-cli ad-groups 1234567890 --campaign 98765
```

Options:
- `--campaign <id>` -- filter by campaign ID
- `--status <status>` -- filter by status: ENABLED, PAUSED, REMOVED
- `--limit <n>` -- max results (default 100)

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
- `--campaign <id>` -- filter by campaign ID
- `--ad-group <id>` -- filter by ad group ID
- `--status <status>` -- filter by status: ENABLED, PAUSED, REMOVED
- `--limit <n>` -- max results (default 100)

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
- `--start <date>` -- start date (YYYY-MM-DD) **required**
- `--end <date>` -- end date (YYYY-MM-DD) **required**
- `--campaign <id>` -- filter by campaign ID
- `--segments <segs>` -- additional segments (comma-separated): device, ad_network_type, day_of_week
- `--limit <n>` -- max results (default 1000)

Default metrics: impressions, clicks, cost_micros, conversions, conversions_value, ctr, average_cpc, average_cpm, interactions, all_conversions

### ad-group-stats

Get ad group performance stats.

```bash
google-ads-open-cli ad-group-stats 1234567890 --start 2026-01-01 --end 2026-01-31
```

Options:
- `--start <date>` -- start date (YYYY-MM-DD) **required**
- `--end <date>` -- end date (YYYY-MM-DD) **required**
- `--campaign <id>` -- filter by campaign ID
- `--ad-group <id>` -- filter by ad group ID
- `--limit <n>` -- max results (default 1000)

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
- `--campaign <id>` -- filter by campaign ID
- `--ad-group <id>` -- filter by ad group ID
- `--status <status>` -- filter by status: ENABLED, PAUSED, REMOVED
- `--limit <n>` -- max results (default 100)

### audiences

List audience segments.

```bash
google-ads-open-cli audiences 1234567890
```

Options:
- `--limit <n>` -- max results (default 100)

### user-lists

List remarketing/user lists.

```bash
google-ads-open-cli user-lists 1234567890
```

Options:
- `--limit <n>` -- max results (default 100)

### negative-keywords

List shared negative keyword lists.

```bash
google-ads-open-cli negative-keywords 1234567890
```

Options:
- `--limit <n>` -- max results (default 100)

### assets

List assets (images, videos, text, sitelinks, etc.).

```bash
google-ads-open-cli assets 1234567890
google-ads-open-cli assets 1234567890 --type SITELINK
```

Options:
- `--type <type>` -- filter by type: IMAGE, MEDIA_BUNDLE, TEXT, YOUTUBE_VIDEO, LEAD_FORM, CALL, CALLOUT, SITELINK, STRUCTURED_SNIPPET
- `--limit <n>` -- max results (default 100)

### extensions

List ad extensions (campaign-level asset links).

```bash
google-ads-open-cli extensions 1234567890
google-ads-open-cli extensions 1234567890 --campaign 98765
```

Options:
- `--campaign <id>` -- filter by campaign ID
- `--limit <n>` -- max results (default 100)

### conversion-actions

List conversion actions.

```bash
google-ads-open-cli conversion-actions 1234567890
```

Options:
- `--limit <n>` -- max results (default 100)

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
```

Options:
- `--limit <n>` -- max results (default 50)

## Error output

All errors are JSON to stderr:

```json
{"error": "No credentials found. Provide one of: ..."}
```

## API Reference

- [Google Ads API Overview](https://developers.google.com/google-ads/api/docs/start)
- [GAQL Reference](https://developers.google.com/google-ads/api/docs/query/overview)
- [Resource Reference](https://developers.google.com/google-ads/api/fields/v23/overview)

## Related

- [meta-ads-open-cli](https://github.com/Bin-Huang/meta-ads-open-cli) -- Meta Ads
- [microsoft-ads-cli](https://github.com/Bin-Huang/microsoft-ads-cli) -- Microsoft Ads
- [apple-ads-cli](https://github.com/Bin-Huang/apple-ads-cli) -- Apple Ads
- [google-analytics-cli](https://github.com/Bin-Huang/google-analytics-cli) -- Google Analytics
- [google-search-console-cli](https://github.com/Bin-Huang/google-search-console-cli) -- Google Search Console

## License

Apache-2.0
