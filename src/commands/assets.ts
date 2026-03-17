import { Command } from "commander";
import { loadCredentials } from "../auth.js";
import { queryGaql } from "../api.js";
import { output, fatal, normalizeCustomerId } from "../utils.js";

export function registerAssetCommands(program: Command): void {
  program
    .command("assets <customer-id>")
    .description("List assets (images, videos, text, etc.)")
    .option("--type <type>", "Filter by type: IMAGE, MEDIA_BUNDLE, TEXT, YOUTUBE_VIDEO, LEAD_FORM, CALL, CALLOUT, SITELINK, STRUCTURED_SNIPPET")
    .option("--limit <n>", "Max results", "100")
    .action(async (customerId: string, opts) => {
      try {
        const creds = loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        let query = `SELECT asset.id, asset.name, asset.type, asset.final_urls, asset.resource_name FROM asset`;
        if (opts.type) query += ` WHERE asset.type = '${opts.type}'`;
        query += ` ORDER BY asset.id LIMIT ${opts.limit}`;
        const data = await queryGaql({ creds, customerId: id, query });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("extensions <customer-id>")
    .description("List ad extensions (campaign/ad group level asset links)")
    .option("--campaign <id>", "Filter by campaign ID")
    .option("--limit <n>", "Max results", "100")
    .action(async (customerId: string, opts) => {
      try {
        const creds = loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        let query = `SELECT campaign_asset.asset, campaign_asset.field_type, campaign_asset.status, campaign.id, campaign.name FROM campaign_asset`;
        if (opts.campaign) query += ` WHERE campaign.id = ${opts.campaign}`;
        query += ` LIMIT ${opts.limit}`;
        const data = await queryGaql({ creds, customerId: id, query });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("conversion-actions <customer-id>")
    .description("List conversion actions")
    .option("--limit <n>", "Max results", "100")
    .action(async (customerId: string, opts) => {
      try {
        const creds = loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        const data = await queryGaql({
          creds,
          customerId: id,
          query: `SELECT conversion_action.id, conversion_action.name, conversion_action.type, conversion_action.status, conversion_action.category, conversion_action.counting_type, conversion_action.click_through_lookback_window_days, conversion_action.view_through_lookback_window_days FROM conversion_action ORDER BY conversion_action.id LIMIT ${opts.limit}`,
        });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });
}
