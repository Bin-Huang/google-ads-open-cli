---
name: google-ads-open-cli
description: >
  Google Ads data analysis and reporting via google-ads-open-cli.
  Use when the user wants to check Google Ads performance, pull campaign/ad group/keyword stats,
  explore account structure, audit conversions, or run custom GAQL queries.
  Triggers: "Google Ads", "ad performance", "campaign stats", "GAQL", "ad spend", "keyword report",
  "search terms", "conversion tracking", "impression share", "ad account".
---

# Google Ads CLI Skill

You have access to `google-ads-open-cli`, a read-only CLI for the Google Ads API (v23). Use it to query ad accounts, pull performance stats, and run custom GAQL queries.

## Quick start

```bash
# Check if the CLI is available
google-ads-open-cli --help

# List accessible accounts
google-ads-open-cli customers
```

If the CLI is not installed, install it:

```bash
npm install -g google-ads-open-cli
```

## Authentication

The CLI requires two credentials: an **OAuth2 access token** and a **developer token**. Credentials are resolved in this order:

1. `--credentials <path>` flag (per-command)
2. Environment variables: `GOOGLE_ADS_ACCESS_TOKEN` + `GOOGLE_ADS_DEVELOPER_TOKEN`
3. Auto-detected file: `~/.config/google-ads-open-cli/credentials.json`

For MCC (manager) accounts, also set `GOOGLE_ADS_LOGIN_CUSTOMER_ID`.

Before running any command, verify credentials are configured by running `google-ads-open-cli customers`. If it fails with a credentials error, ask the user to set up authentication.

## Entity hierarchy

```
Manager Account (MCC)
 └── Customer Account (10-digit ID, e.g. 1234567890)
      ├── Campaign
      │    └── Ad Group
      │         ├── Ad (Ad Group Ad)
      │         └── Keyword (Ad Group Criterion)
      ├── Campaign Budget
      ├── Conversion Action
      ├── User List (remarketing)
      └── Asset (images, videos, sitelinks)
```

Customer IDs are 10-digit numbers. Dashes are stripped automatically.

## Monetary values

Google Ads uses **micros**: 1 currency unit = 1,000,000 micros. All cost/bid/budget values returned by the CLI are in micros. Always divide by 1,000,000 when presenting monetary values to the user.

## Output format

All commands output pretty-printed JSON by default. Use `--format compact` for single-line JSON (useful for piping).

## Built-in commands

### Account discovery

```bash
# List all accessible accounts
google-ads-open-cli customers

# Get details for a specific account
google-ads-open-cli customer 1234567890

# List sub-accounts under an MCC
google-ads-open-cli account-hierarchy 1234567890
```

### Browsing entities

```bash
# Campaigns (filter by status: ENABLED, PAUSED, REMOVED)
google-ads-open-cli campaigns 1234567890
google-ads-open-cli campaigns 1234567890 --status ENABLED

# Get a specific campaign
google-ads-open-cli campaign 1234567890 98765

# Campaign budgets
google-ads-open-cli campaign-budgets 1234567890

# Ad groups (filter by campaign, status)
google-ads-open-cli ad-groups 1234567890 --campaign 98765

# Get a specific ad group
google-ads-open-cli ad-group 1234567890 11111

# Ads (filter by campaign, ad group, status)
google-ads-open-cli ads 1234567890 --campaign 98765 --ad-group 11111

# Get a specific ad (requires ad-group-id and ad-id)
google-ads-open-cli ad 1234567890 11111 22222

# Keywords
google-ads-open-cli keywords 1234567890 --campaign 98765 --status ENABLED
```

All listing commands support `--limit <n>` (default 100).

### Performance stats

Stats commands require `--start` and `--end` dates (YYYY-MM-DD):

```bash
# Campaign stats
google-ads-open-cli campaign-stats 1234567890 --start 2026-01-01 --end 2026-01-31

# Campaign stats with device segment
google-ads-open-cli campaign-stats 1234567890 --start 2026-01-01 --end 2026-01-31 --segments device

# Ad group stats (filter by --campaign and/or --ad-group)
google-ads-open-cli ad-group-stats 1234567890 --start 2026-01-01 --end 2026-01-31 --campaign 98765

# Ad-level stats (filter by --campaign and/or --ad-group)
google-ads-open-cli ad-stats 1234567890 --start 2026-01-01 --end 2026-01-31

# Keyword stats (sorted by impressions desc; filter by --campaign and/or --ad-group)
google-ads-open-cli keyword-stats 1234567890 --start 2026-01-01 --end 2026-01-31
```

Available segments for `campaign-stats --segments`: `device`, `ad_network_type`, `day_of_week` (comma-separated).

Stats commands default to `--limit 1000`.

### Other commands

```bash
# Audiences and remarketing lists
google-ads-open-cli audiences 1234567890
google-ads-open-cli user-lists 1234567890

# Assets and extensions
google-ads-open-cli assets 1234567890 --type SITELINK
google-ads-open-cli extensions 1234567890 --campaign 98765

# Conversions and billing
google-ads-open-cli conversion-actions 1234567890
google-ads-open-cli billing 1234567890

# Change history
google-ads-open-cli change-status 1234567890 --limit 20

# Negative keyword lists
google-ads-open-cli negative-keywords 1234567890
```

Asset types: `IMAGE`, `MEDIA_BUNDLE`, `TEXT`, `YOUTUBE_VIDEO`, `LEAD_FORM`, `CALL`, `CALLOUT`, `SITELINK`, `STRUCTURED_SNIPPET`.

## Custom GAQL queries

The `query` command is the escape hatch for anything not covered by built-in commands. It runs arbitrary GAQL (Google Ads Query Language) against the Google Ads API.

```bash
google-ads-open-cli query <customer-id> "<GAQL>"
```

### GAQL syntax

```sql
SELECT field1, field2, ...
FROM resource_name
WHERE conditions
ORDER BY field [ASC|DESC]
LIMIT count
PARAMETERS key=value
```

- `SELECT` and `FROM` are required. `WHERE`, `ORDER BY`, `LIMIT`, `PARAMETERS` are optional.
- Keywords (`SELECT`, `FROM`, `WHERE`, etc.) are case-insensitive.
- Field names, resource names, and enum values are **case-sensitive**.
- No `OR` operator -- all WHERE conditions are `AND`-ed together.
- No `JOIN`, `GROUP BY`, `HAVING`, or subqueries.

### WHERE operators

| Operator | Example |
|---|---|
| `=`, `!=`, `>`, `<`, `>=`, `<=` | `campaign.status = 'ENABLED'` |
| `IN`, `NOT IN` | `campaign.status IN ('ENABLED', 'PAUSED')` |
| `LIKE`, `NOT LIKE` | `campaign.name LIKE '%brand%'` (case-insensitive) |
| `REGEXP_MATCH` | `campaign.name REGEXP_MATCH '(?i)brand'` |
| `BETWEEN ... AND ...` | `segments.date BETWEEN '2026-01-01' AND '2026-01-31'` |
| `DURING` | `segments.date DURING LAST_30_DAYS` |
| `IS NULL`, `IS NOT NULL` | `ad_group_ad.ad.final_urls IS NOT NULL` |
| `CONTAINS ANY/ALL/NONE` | For repeated fields |

### Date filtering

Custom range:
```sql
WHERE segments.date BETWEEN '2026-01-01' AND '2026-01-31'
```

Predefined ranges (with `DURING`):
- `TODAY`, `YESTERDAY`
- `LAST_7_DAYS`, `LAST_14_DAYS`, `LAST_30_DAYS` (NOT including today)
- `THIS_MONTH`, `LAST_MONTH`
- `THIS_WEEK_SUN_TODAY`, `THIS_WEEK_MON_TODAY`
- `LAST_WEEK_SUN_SAT`, `LAST_WEEK_MON_SUN`
- `LAST_BUSINESS_WEEK`

### Common resource names (FROM clause)

**Entities:** `customer`, `campaign`, `campaign_budget`, `ad_group`, `ad_group_ad`, `ad_group_criterion`, `campaign_criterion`

**View resources (for metrics):** `keyword_view`, `search_term_view`, `geographic_view`, `gender_view`, `age_range_view`, `landing_page_view`, `ad_group_audience_view`, `shopping_performance_view`, `click_view`

**Other:** `change_status`, `change_event`, `conversion_action`, `asset`, `bidding_strategy`, `label`, `recommendation`, `shared_set`, `shared_criterion`

### Common metrics

**Performance:** `metrics.impressions`, `metrics.clicks`, `metrics.cost_micros`, `metrics.ctr`, `metrics.average_cpc`, `metrics.average_cpm`, `metrics.interactions`

**Conversions:** `metrics.conversions`, `metrics.conversions_value`, `metrics.all_conversions`, `metrics.cost_per_conversion`, `metrics.conversion_rate`, `metrics.value_per_conversion`

**Impression share:** `metrics.search_impression_share`, `metrics.search_budget_lost_impression_share`, `metrics.search_rank_lost_impression_share`, `metrics.absolute_top_impression_percentage`, `metrics.top_impression_percentage`

**Video:** `metrics.video_views`, `metrics.video_view_rate`, `metrics.average_cpv`

### Common segments

**Date:** `segments.date`, `segments.week`, `segments.month`, `segments.quarter`, `segments.year`, `segments.hour_of_day`, `segments.day_of_week`

**Device/network:** `segments.device`, `segments.ad_network_type`, `segments.slot`, `segments.click_type`

**Conversion:** `segments.conversion_action`, `segments.conversion_action_name`, `segments.conversion_action_category`

### Important GAQL rules

1. **Date range required with date segments.** If `segments.date` (or `segments.week`, `segments.month`, etc.) is in SELECT, a finite date range filter MUST be in WHERE.

2. **Non-date segments in WHERE must be in SELECT.** Exception: date segments can appear in WHERE without being in SELECT.

3. **Removed entities are included by default.** The API does NOT filter out removed entities. Add `campaign.status != 'REMOVED'` (or equivalent) to match Google Ads UI behavior.

4. **Field compatibility.** Not all fields can be selected together. If you get an error about incompatible fields, remove fields one at a time or consult the Google Ads API field compatibility documentation.

5. **ORDER BY fields must be in SELECT.** You can only order by fields that appear in the SELECT clause.

6. **Attributed resources.** You can select parent entity fields without them being in FROM. For example, `campaign.name` is available when `FROM ad_group`.

### GAQL query examples

**Search terms that triggered ads:**
```bash
google-ads-open-cli query 1234567890 "SELECT search_term_view.search_term, search_term_view.status, campaign.name, ad_group.name, metrics.clicks, metrics.impressions, metrics.ctr, metrics.cost_micros FROM search_term_view WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.impressions DESC LIMIT 50"
```

**Campaign performance by device:**
```bash
google-ads-open-cli query 1234567890 "SELECT campaign.name, segments.device, metrics.impressions, metrics.clicks, metrics.ctr, metrics.cost_micros, metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS AND campaign.status != 'REMOVED'"
```

**Impression share analysis:**
```bash
google-ads-open-cli query 1234567890 "SELECT campaign.name, metrics.search_impression_share, metrics.search_budget_lost_impression_share, metrics.search_rank_lost_impression_share, metrics.clicks, metrics.impressions, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_7_DAYS AND campaign.status = 'ENABLED' ORDER BY metrics.search_budget_lost_impression_share DESC"
```

**Landing page performance:**
```bash
google-ads-open-cli query 1234567890 "SELECT landing_page_view.unexpanded_final_url, metrics.clicks, metrics.impressions, metrics.ctr, metrics.cost_micros, metrics.conversions FROM landing_page_view WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.clicks DESC LIMIT 20"
```

**Demographics -- age breakdown:**
```bash
google-ads-open-cli query 1234567890 "SELECT ad_group_criterion.age_range.type, campaign.name, metrics.clicks, metrics.impressions, metrics.ctr, metrics.cost_micros FROM age_range_view WHERE segments.date DURING LAST_30_DAYS"
```

**Geographic performance (by user location):**
```bash
google-ads-open-cli query 1234567890 "SELECT geographic_view.country_criterion_id, geographic_view.location_type, campaign.name, metrics.clicks, metrics.impressions, metrics.cost_micros FROM geographic_view WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.clicks DESC LIMIT 50"
```

**Ad copy performance (responsive search ads):**
```bash
google-ads-open-cli query 1234567890 "SELECT ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions, ad_group_ad.ad.final_urls, ad_group_ad.status, metrics.clicks, metrics.impressions, metrics.ctr, metrics.cost_micros FROM ad_group_ad WHERE segments.date DURING LAST_30_DAYS AND ad_group_ad.status != 'REMOVED' AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD' ORDER BY metrics.clicks DESC LIMIT 20"
```

**Conversion actions audit:**
```bash
google-ads-open-cli query 1234567890 "SELECT conversion_action.name, conversion_action.type, conversion_action.status, conversion_action.category, conversion_action.counting_type, conversion_action.click_through_lookback_window_days, conversion_action.view_through_lookback_window_days FROM conversion_action WHERE conversion_action.status = 'ENABLED'"
```

**Shopping product performance:**
```bash
google-ads-open-cli query 1234567890 "SELECT segments.product_item_id, segments.product_title, metrics.clicks, metrics.impressions, metrics.ctr, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM shopping_performance_view WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.conversions_value DESC LIMIT 50"
```

**Account-level daily trend:**
```bash
google-ads-open-cli query 1234567890 "SELECT segments.date, metrics.clicks, metrics.impressions, metrics.ctr, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM customer WHERE segments.date DURING LAST_30_DAYS ORDER BY segments.date"
```

## Workflow guidance

### When the user asks for a quick overview

1. Run `google-ads-open-cli customers` to find accessible accounts
2. Use `campaign-stats` with a recent date range for a performance snapshot
3. Present the data with costs converted from micros to currency

### When the user asks for deep analysis

1. Start with `campaign-stats` to identify the scope
2. Drill down with `ad-group-stats` or `keyword-stats` for underperforming campaigns
3. Use custom GAQL queries for specific analysis (search terms, demographics, impression share, landing pages)
4. Cross-reference with `conversion-actions` to verify tracking setup

### When the user asks about specific metrics not in built-in commands

Use the `query` command with GAQL. Common scenarios:
- **Search terms report** -- use `search_term_view`
- **Geographic data** -- use `geographic_view`
- **Demographics** -- use `gender_view`, `age_range_view`
- **Landing pages** -- use `landing_page_view`
- **Impression share** -- select `metrics.search_impression_share` and related fields from `campaign`
- **Shopping products** -- use `shopping_performance_view`
- **Change history** -- use `change_event` for detailed logs

### Error handling

- **Authentication errors** -- ask the user to verify their access token and developer token
- **"field is not compatible"** -- some fields cannot be selected together; remove incompatible fields and retry
- **Empty results** -- check date range, status filters, and whether the account has data for the requested entities
- **"MISALIGNED_DATE_FOR_FILTER"** -- when filtering `segments.month` or `segments.quarter`, the date must be the first day of the period

## API documentation references

- [google-ads-open-cli documentation](https://github.com/Bin-Huang/google-ads-open-cli)
- [Google Ads API overview](https://developers.google.com/google-ads/api/docs/start)
- [GAQL reference](https://developers.google.com/google-ads/api/docs/query/overview)
- [GAQL grammar](https://developers.google.com/google-ads/api/docs/query/grammar)
- [Resource field reference (v23)](https://developers.google.com/google-ads/api/fields/v23/overview)
- [GAQL query cookbook](https://developers.google.com/google-ads/api/docs/query/cookbook)
- [Segmentation rules](https://developers.google.com/google-ads/api/docs/reporting/segmentation)
