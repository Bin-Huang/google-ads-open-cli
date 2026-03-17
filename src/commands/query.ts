import { Command } from "commander";
import { loadCredentials } from "../auth.js";
import { queryGaql } from "../api.js";
import { output, fatal, normalizeCustomerId } from "../utils.js";

export function registerQueryCommands(program: Command): void {
  program
    .command("query <customer-id> <gaql>")
    .description("Run a raw GAQL query (Google Ads Query Language)")
    .action(async (customerId: string, gaql: string) => {
      try {
        const creds = loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        const data = await queryGaql({ creds, customerId: id, query: gaql });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("billing <customer-id>")
    .description("Get billing setup and account budget info")
    .action(async (customerId: string) => {
      try {
        const creds = loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        const data = await queryGaql({
          creds,
          customerId: id,
          query: `SELECT billing_setup.id, billing_setup.status, billing_setup.payments_account, billing_setup.start_date_time, billing_setup.end_date_time FROM billing_setup`,
        });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("change-status <customer-id>")
    .description("Get recent change history")
    .option("--limit <n>", "Max results", "50")
    .action(async (customerId: string, opts) => {
      try {
        const creds = loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        const data = await queryGaql({
          creds,
          customerId: id,
          query: `SELECT change_status.resource_name, change_status.resource_type, change_status.resource_status, change_status.last_change_date_time FROM change_status ORDER BY change_status.last_change_date_time DESC LIMIT ${opts.limit}`,
        });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });
}
