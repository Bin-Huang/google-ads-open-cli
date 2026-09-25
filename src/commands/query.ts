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
        const creds = await loadCredentials(program.opts().credentials);
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
        const creds = await loadCredentials(program.opts().credentials);
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
    .option("--days <n>", "Look back this many days, including today (1-90)", "14")
    .option("--limit <n>", "Max results (max 10000)", "50")
    .action(async (customerId: string, opts) => {
      try {
        const days = Number(opts.days);
        if (!Number.isInteger(days) || days < 1 || days > 90) {
          fatal("--days must be an integer between 1 and 90.");
        }
        const creds = await loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        // change_status requires a finite last_change_date_time range within the past 90 days.
        // The upper bound is tomorrow so that changes made today (in any account time zone) are included.
        const start = formatDate(addDays(new Date(), -(days - 1)));
        const end = formatDate(addDays(new Date(), 1));
        const data = await queryGaql({
          creds,
          customerId: id,
          query: `SELECT change_status.resource_name, change_status.resource_type, change_status.resource_status, change_status.last_change_date_time FROM change_status WHERE change_status.last_change_date_time >= '${start}' AND change_status.last_change_date_time <= '${end}' ORDER BY change_status.last_change_date_time DESC LIMIT ${opts.limit}`,
        });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Format a date as YYYY-MM-DD in local time */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
