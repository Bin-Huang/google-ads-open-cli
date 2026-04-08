import { Command } from "commander";
import { loadCredentials } from "../auth.js";
import { queryGaql } from "../api.js";
import { output, fatal, normalizeCustomerId } from "../utils.js";

export function registerCampaignCommands(program: Command): void {
  program
    .command("campaigns <customer-id>")
    .description("List campaigns for a customer account")
    .option("--status <status>", "Filter by status: ENABLED, PAUSED, REMOVED")
    .option("--limit <n>", "Max results", "100")
    .action(async (customerId: string, opts) => {
      try {
        const creds = await loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        let query = `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.bidding_strategy_type, campaign.campaign_budget, campaign.start_date, campaign.end_date, campaign.serving_status FROM campaign`;
        const conditions: string[] = [];
        if (opts.status) conditions.push(`campaign.status = '${opts.status}'`);
        if (conditions.length > 0) query += ` WHERE ${conditions.join(" AND ")}`;
        query += ` ORDER BY campaign.id LIMIT ${opts.limit}`;
        const data = await queryGaql({ creds, customerId: id, query });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("campaign <customer-id> <campaign-id>")
    .description("Get a specific campaign")
    .action(async (customerId: string, campaignId: string) => {
      try {
        const creds = await loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        const data = await queryGaql({
          creds,
          customerId: id,
          query: `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.advertising_channel_sub_type, campaign.bidding_strategy_type, campaign.campaign_budget, campaign.start_date, campaign.end_date, campaign.serving_status, campaign.network_settings.target_google_search, campaign.network_settings.target_search_network, campaign.network_settings.target_content_network, campaign.url_custom_parameters FROM campaign WHERE campaign.id = ${campaignId}`,
        });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("campaign-budgets <customer-id>")
    .description("List campaign budgets")
    .option("--limit <n>", "Max results", "100")
    .action(async (customerId: string, opts) => {
      try {
        const creds = await loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        const data = await queryGaql({
          creds,
          customerId: id,
          query: `SELECT campaign_budget.id, campaign_budget.name, campaign_budget.amount_micros, campaign_budget.total_amount_micros, campaign_budget.status, campaign_budget.delivery_method, campaign_budget.period, campaign_budget.type FROM campaign_budget ORDER BY campaign_budget.id LIMIT ${opts.limit}`,
        });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });
}
