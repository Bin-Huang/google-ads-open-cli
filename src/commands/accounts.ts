import { Command } from "commander";
import { loadCredentials } from "../auth.js";
import { callApi, queryGaql } from "../api.js";
import { output, fatal, normalizeCustomerId } from "../utils.js";

export function registerAccountCommands(program: Command): void {
  program
    .command("customers")
    .description("List accessible customer accounts")
    .action(async () => {
      try {
        const creds = await loadCredentials(program.opts().credentials);
        const data = await callApi({
          creds,
          path: "customers:listAccessibleCustomers",
        });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("customer <customer-id>")
    .description("Get a specific customer account")
    .action(async (customerId: string) => {
      try {
        const creds = await loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        const data = await queryGaql({
          creds,
          customerId: id,
          query: `SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.auto_tagging_enabled, customer.manager, customer.test_account, customer.status FROM customer`,
        });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });

  program
    .command("account-hierarchy <customer-id>")
    .description("List manager account hierarchy (sub-accounts)")
    .action(async (customerId: string) => {
      try {
        const creds = await loadCredentials(program.opts().credentials);
        const id = normalizeCustomerId(customerId);
        const data = await queryGaql({
          creds,
          customerId: id,
          query: `SELECT customer_client.client_customer, customer_client.level, customer_client.manager, customer_client.descriptive_name, customer_client.currency_code, customer_client.time_zone, customer_client.id, customer_client.status FROM customer_client ORDER BY customer_client.level`,
        });
        output(data, program.opts().format);
      } catch (err) {
        fatal((err as Error).message);
      }
    });
}
