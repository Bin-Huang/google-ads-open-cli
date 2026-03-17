import { Command } from "commander";
import { loadCredentials } from "../auth.js";
import { queryGaql } from "../api.js";
import { output, fatal, normalizeCustomerId } from "../utils.js";

export function registerAdGroupCommands(program: Command): void {
  program
    .command("ad-groups <customer-id>")
    .description("List ad groups for a customer account")
    .option("--campaign <id>", "Filter by campaign ID")
    .option("--status <status>", "Filter by status: ENABLED, PAUSED, REMOVED")
    .option("--limit <n>", "Max results", "100")
    .action(async (customerId: string, opts) => {
      try {
        const creds = loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        let query = `SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.type, ad_group.campaign, ad_group.cpc_bid_micros, ad_group.cpm_bid_micros FROM ad_group`;
        const conditions: string[] = [];
        if (opts.campaign) conditions.push(`campaign.id = ${opts.campaign}`);
        if (opts.status) conditions.push(`ad_group.status = '${opts.status}'`);
        if (conditions.length > 0) query += ` WHERE ${conditions.join(" AND ")}`;
        query += ` ORDER BY ad_group.id LIMIT ${opts.limit}`;
        const data = await queryGaql({ creds, customerId: id, query });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("ad-group <customer-id> <ad-group-id>")
    .description("Get a specific ad group")
    .action(async (customerId: string, adGroupId: string) => {
      try {
        const creds = loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        const data = await queryGaql({
          creds,
          customerId: id,
          query: `SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.type, ad_group.campaign, ad_group.cpc_bid_micros, ad_group.cpm_bid_micros, ad_group.target_cpa_micros, ad_group.effective_target_cpa_micros, ad_group.effective_target_roas FROM ad_group WHERE ad_group.id = ${adGroupId}`,
        });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("ads <customer-id>")
    .description("List ad group ads")
    .option("--campaign <id>", "Filter by campaign ID")
    .option("--ad-group <id>", "Filter by ad group ID")
    .option("--status <status>", "Filter by status: ENABLED, PAUSED, REMOVED")
    .option("--limit <n>", "Max results", "100")
    .action(async (customerId: string, opts) => {
      try {
        const creds = loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        let query = `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type, ad_group_ad.ad.final_urls, ad_group_ad.status, ad_group_ad.ad_group, ad_group_ad.policy_summary.approval_status FROM ad_group_ad`;
        const conditions: string[] = [];
        if (opts.campaign) conditions.push(`campaign.id = ${opts.campaign}`);
        if (opts.adGroup) conditions.push(`ad_group.id = ${opts.adGroup}`);
        if (opts.status) conditions.push(`ad_group_ad.status = '${opts.status}'`);
        if (conditions.length > 0) query += ` WHERE ${conditions.join(" AND ")}`;
        query += ` ORDER BY ad_group_ad.ad.id LIMIT ${opts.limit}`;
        const data = await queryGaql({ creds, customerId: id, query });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("ad <customer-id> <ad-group-id> <ad-id>")
    .description("Get a specific ad")
    .action(async (customerId: string, adGroupId: string, adId: string) => {
      try {
        const creds = loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        const data = await queryGaql({
          creds,
          customerId: id,
          query: `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type, ad_group_ad.ad.final_urls, ad_group_ad.ad.display_url, ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions, ad_group_ad.status, ad_group_ad.ad_group, ad_group_ad.policy_summary.approval_status FROM ad_group_ad WHERE ad_group.id = ${adGroupId} AND ad_group_ad.ad.id = ${adId}`,
        });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });
}
