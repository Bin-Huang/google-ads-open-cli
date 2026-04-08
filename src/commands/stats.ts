import { Command } from "commander";
import { loadCredentials } from "../auth.js";
import { queryGaql } from "../api.js";
import { output, fatal, normalizeCustomerId } from "../utils.js";

export function registerStatsCommands(program: Command): void {
  program
    .command("campaign-stats <customer-id>")
    .description("Get campaign performance stats")
    .requiredOption("--start <date>", "Start date (YYYY-MM-DD)")
    .requiredOption("--end <date>", "End date (YYYY-MM-DD)")
    .option("--campaign <id>", "Filter by campaign ID")
    .option("--segments <segs>", "Additional segments: device, ad_network_type, day_of_week (comma-separated)")
    .option("--limit <n>", "Max results", "1000")
    .action(async (customerId: string, opts) => {
      try {
        const creds = await loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        const segments = opts.segments ? opts.segments.split(",").map((s: string) => `segments.${s.trim()}`).join(", ") : "";
        const segmentFields = segments ? `, ${segments}` : "";
        let query = `SELECT campaign.id, campaign.name, segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc, metrics.average_cpm, metrics.interactions, metrics.all_conversions${segmentFields} FROM campaign WHERE segments.date BETWEEN '${opts.start}' AND '${opts.end}'`;
        if (opts.campaign) query += ` AND campaign.id = ${opts.campaign}`;
        query += ` ORDER BY segments.date LIMIT ${opts.limit}`;
        const data = await queryGaql({ creds, customerId: id, query });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("ad-group-stats <customer-id>")
    .description("Get ad group performance stats")
    .requiredOption("--start <date>", "Start date (YYYY-MM-DD)")
    .requiredOption("--end <date>", "End date (YYYY-MM-DD)")
    .option("--campaign <id>", "Filter by campaign ID")
    .option("--ad-group <id>", "Filter by ad group ID")
    .option("--limit <n>", "Max results", "1000")
    .action(async (customerId: string, opts) => {
      try {
        const creds = await loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        let query = `SELECT ad_group.id, ad_group.name, campaign.id, segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc FROM ad_group WHERE segments.date BETWEEN '${opts.start}' AND '${opts.end}'`;
        if (opts.campaign) query += ` AND campaign.id = ${opts.campaign}`;
        if (opts.adGroup) query += ` AND ad_group.id = ${opts.adGroup}`;
        query += ` ORDER BY segments.date LIMIT ${opts.limit}`;
        const data = await queryGaql({ creds, customerId: id, query });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("ad-stats <customer-id>")
    .description("Get ad-level performance stats")
    .requiredOption("--start <date>", "Start date (YYYY-MM-DD)")
    .requiredOption("--end <date>", "End date (YYYY-MM-DD)")
    .option("--campaign <id>", "Filter by campaign ID")
    .option("--ad-group <id>", "Filter by ad group ID")
    .option("--limit <n>", "Max results", "1000")
    .action(async (customerId: string, opts) => {
      try {
        const creds = await loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        let query = `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type, ad_group.id, campaign.id, segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc FROM ad_group_ad WHERE segments.date BETWEEN '${opts.start}' AND '${opts.end}'`;
        if (opts.campaign) query += ` AND campaign.id = ${opts.campaign}`;
        if (opts.adGroup) query += ` AND ad_group.id = ${opts.adGroup}`;
        query += ` ORDER BY segments.date LIMIT ${opts.limit}`;
        const data = await queryGaql({ creds, customerId: id, query });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("keyword-stats <customer-id>")
    .description("Get keyword-level performance stats")
    .requiredOption("--start <date>", "Start date (YYYY-MM-DD)")
    .requiredOption("--end <date>", "End date (YYYY-MM-DD)")
    .option("--campaign <id>", "Filter by campaign ID")
    .option("--ad-group <id>", "Filter by ad group ID")
    .option("--limit <n>", "Max results", "1000")
    .action(async (customerId: string, opts) => {
      try {
        const creds = await loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        let query = `SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.status, ad_group.id, campaign.id, segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc FROM keyword_view WHERE segments.date BETWEEN '${opts.start}' AND '${opts.end}'`;
        if (opts.campaign) query += ` AND campaign.id = ${opts.campaign}`;
        if (opts.adGroup) query += ` AND ad_group.id = ${opts.adGroup}`;
        query += ` ORDER BY metrics.impressions DESC LIMIT ${opts.limit}`;
        const data = await queryGaql({ creds, customerId: id, query });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });
}
