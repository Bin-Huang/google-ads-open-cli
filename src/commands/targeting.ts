import { Command } from "commander";
import { loadCredentials } from "../auth.js";
import { queryGaql } from "../api.js";
import { output, fatal, normalizeCustomerId } from "../utils.js";

export function registerTargetingCommands(program: Command): void {
  program
    .command("keywords <customer-id>")
    .description("List keywords (ad group criteria)")
    .option("--campaign <id>", "Filter by campaign ID")
    .option("--ad-group <id>", "Filter by ad group ID")
    .option("--status <status>", "Filter by status: ENABLED, PAUSED, REMOVED")
    .option("--limit <n>", "Max results", "100")
    .action(async (customerId: string, opts) => {
      try {
        const creds = loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        let query = `SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.status, ad_group_criterion.quality_info.quality_score, ad_group_criterion.cpc_bid_micros, ad_group.id, campaign.id FROM ad_group_criterion WHERE ad_group_criterion.type = 'KEYWORD'`;
        if (opts.campaign) query += ` AND campaign.id = ${opts.campaign}`;
        if (opts.adGroup) query += ` AND ad_group.id = ${opts.adGroup}`;
        if (opts.status) query += ` AND ad_group_criterion.status = '${opts.status}'`;
        query += ` ORDER BY ad_group_criterion.criterion_id LIMIT ${opts.limit}`;
        const data = await queryGaql({ creds, customerId: id, query });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("audiences <customer-id>")
    .description("List audience segments")
    .option("--limit <n>", "Max results", "100")
    .action(async (customerId: string, opts) => {
      try {
        const creds = loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        const data = await queryGaql({
          creds,
          customerId: id,
          query: `SELECT campaign_audience_view.resource_name, campaign.id, campaign.name, metrics.impressions, metrics.clicks FROM campaign_audience_view LIMIT ${opts.limit}`,
        });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("user-lists <customer-id>")
    .description("List remarketing/user lists")
    .option("--limit <n>", "Max results", "100")
    .action(async (customerId: string, opts) => {
      try {
        const creds = loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        const data = await queryGaql({
          creds,
          customerId: id,
          query: `SELECT user_list.id, user_list.name, user_list.description, user_list.membership_status, user_list.size_for_display, user_list.size_for_search, user_list.type FROM user_list ORDER BY user_list.id LIMIT ${opts.limit}`,
        });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("negative-keywords <customer-id>")
    .description("List shared negative keyword lists")
    .option("--limit <n>", "Max results", "100")
    .action(async (customerId: string, opts) => {
      try {
        const creds = loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        const data = await queryGaql({
          creds,
          customerId: id,
          query: `SELECT shared_set.id, shared_set.name, shared_set.type, shared_set.status, shared_set.member_count FROM shared_set WHERE shared_set.type = 'NEGATIVE_KEYWORDS' LIMIT ${opts.limit}`,
        });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });
}
