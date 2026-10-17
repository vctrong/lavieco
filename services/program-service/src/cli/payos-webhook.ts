import { loadProgramEnv } from "../config/env";
import { PayosGateway, payosCredentials } from "../modules/payments";

/**
 * `npm run payos:webhook -- <url>`: registers the payOS webhook URL of the payment
 * channel (SDK `webhooks.confirm`). payOS sends a sample payment to the URL first, so
 * `web` and program-service must be running and reachable (tunnel in development,
 * docs/runbooks/payos.md). The URL must be the `web` route, never the service.
 */
async function main() {
  const url = process.argv[2];
  if (!url || !/^https:\/\/.+\/api\/payments\/payos\/webhook$/.test(url)) {
    console.error(
      "Usage: npm run payos:webhook -- https://<public host>/api/payments/payos/webhook",
    );
    process.exitCode = 1;
    return;
  }
  const credentials = payosCredentials(loadProgramEnv());
  if (!credentials) {
    console.error("PAYOS_CLIENT_ID, PAYOS_API_KEY and PAYOS_CHECKSUM_KEY must be set");
    process.exitCode = 1;
    return;
  }
  const result = await new PayosGateway(credentials).confirmWebhook(url);
  // Only the URL and channel name: the account number stays out of terminal history.
  console.log(`payOS webhook registered: ${result.webhookUrl} (${result.name})`);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(
      `payOS refused the webhook URL: ${error instanceof Error ? error.message : "unknown"}`,
    );
    process.exitCode = 1;
  });
}
