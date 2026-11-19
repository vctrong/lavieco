import { SignJWT, importPKCS8 } from "jose";

import type { SheetWriter } from "../application/sales-sheet-sync";
import type { SheetTab } from "../application/sheet-export";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const API = "https://sheets.googleapis.com/v4/spreadsheets";
const TIMEOUT_MS = 20_000;

export type GoogleSheetOptions = {
  spreadsheetId: string;
  clientEmail: string;
  /** PEM, with `\n` either real or escaped (as copied from the JSON key file). */
  privateKey: string;
};

/**
 * Google Sheets REST with a service account (ADR-0030): a short-lived access token from a
 * JWT signed here with `jose` (no Google SDK), then one clear and one write for the three
 * tabs. Only this account may edit the Sheet; the team has view access.
 */
export class GoogleSheetWriter implements SheetWriter {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly options: GoogleSheetOptions) {}

  async write(tabs: SheetTab[]) {
    const token = await this.accessToken();
    const base = `${API}/${encodeURIComponent(this.options.spreadsheetId)}/values`;
    await this.call(`${base}:batchClear`, token, {
      ranges: tabs.map((tab) => `${tab.name}!A:Z`),
    });
    await this.call(`${base}:batchUpdate`, token, {
      // RAW: leading zeros stay, "=…" is never a formula.
      valueInputOption: "RAW",
      data: tabs.map((tab) => ({ range: `${tab.name}!A1`, values: tab.rows })),
    });
  }

  private async accessToken() {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const key = await importPKCS8(this.options.privateKey.replace(/\\n/g, "\n"), "RS256");
    const assertion = await new SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(this.options.clientEmail)
      .setAudience(TOKEN_URL)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key);
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`google token: status ${response.status}`);
    const body = (await response.json()) as { access_token?: unknown; expires_in?: unknown };
    if (typeof body.access_token !== "string") throw new Error("google token: no access_token");
    const seconds = typeof body.expires_in === "number" ? body.expires_in : 3_600;
    this.token = { value: body.access_token, expiresAt: Date.now() + seconds * 1_000 };
    return this.token.value;
  }

  private async call(url: string, token: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // Status only: Google's error body may echo cell values (personal data).
    if (!response.ok) throw new Error(`google sheets: status ${response.status}`);
  }
}
