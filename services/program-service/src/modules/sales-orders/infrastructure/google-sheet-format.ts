import { SHEET_COLORS } from "../../registrations";
import { SHEET_DATA_ROW, type SheetTab, type SheetTone } from "../application/sheet-export";

/** What a GET of the spreadsheet tells about one tab before formatting it. */
export type SheetState = { sheetId: number; conditionalFormats: number };

type Rgb = { red: number; green: number; blue: number };

/** `FF20345F` (ARGB of the sheet tokens) → the 0..1 floats of the Sheets API. */
export function rgbOf(argb: string): Rgb {
  const hex = argb.slice(-6);
  const part = (at: number) =>
    Math.round((parseInt(hex.slice(at, at + 2), 16) / 255) * 1000) / 1000;
  return { red: part(0), green: part(2), blue: part(4) };
}

const C = {
  deepBlue: rgbOf(SHEET_COLORS.deepBlue),
  charcoal: rgbOf(SHEET_COLORS.charcoal),
  muted: rgbOf(SHEET_COLORS.muted),
  softWhite: rgbOf(SHEET_COLORS.softWhite),
  mint: rgbOf(SHEET_COLORS.mint),
  emeraldInk: rgbOf(SHEET_COLORS.emeraldInk),
  canarySoft: rgbOf(SHEET_COLORS.canarySoft),
  error: rgbOf(SHEET_COLORS.error),
  hairline: rgbOf(SHEET_COLORS.hairline),
  white: rgbOf(SHEET_COLORS.white),
};

/** Cell look of each tone: background and text, never colour alone (the label is there). */
const TONES: Record<SheetTone, { backgroundColor?: Rgb; textFormat: Record<string, unknown> }> = {
  done: { backgroundColor: C.mint, textFormat: { foregroundColor: C.emeraldInk, bold: true } },
  muted: { textFormat: { foregroundColor: C.muted, italic: true } },
  attention: { backgroundColor: C.canarySoft, textFormat: { foregroundColor: C.charcoal } },
  alert: { textFormat: { foregroundColor: C.error, bold: true } },
};

const FONT = "Be Vietnam Pro";
const DATA = SHEET_DATA_ROW - 1; // 0-based index of the first data row

/**
 * Requests that give a tab its look (ADR-0030, BR-29): merged title row, clear header,
 * frozen rows, widths, money format, zebra rows, status colours. Idempotent: the tab's
 * own conditional rules and dropdowns are replaced each time, so a hand edit of the
 * presentation never sticks and old validations never flag new values.
 */
export function formatRequests(tab: SheetTab, state: SheetState): unknown[] {
  const { sheetId } = state;
  const { widths, money, wrap, frozenColumns, rules } = tab.layout;
  const columns = widths.length;
  const rows = Math.max(tab.rows.length, SHEET_DATA_ROW);
  const range = (startRowIndex: number, endRowIndex?: number, startCol = 0, endCol = columns) => ({
    sheetId,
    startRowIndex,
    ...(endRowIndex === undefined ? {} : { endRowIndex }),
    startColumnIndex: startCol,
    endColumnIndex: endCol,
  });
  const requests: unknown[] = [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 2, frozenColumnCount: frozenColumns },
        },
        fields: "gridProperties.frozenRowCount,gridProperties.frozenColumnCount",
      },
    },
    // No dropdowns: the Sheet is read only, and old lists would flag new values.
    { setDataValidation: { range: { sheetId } } },
    // Row 1: one merged title band.
    { unmergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 } } },
    { mergeCells: { range: range(0, 1), mergeType: "MERGE_ALL" } },
    {
      repeatCell: {
        range: range(0, 1),
        cell: {
          userEnteredFormat: {
            backgroundColor: C.deepBlue,
            textFormat: { fontFamily: FONT, fontSize: 11, bold: true, foregroundColor: C.white },
            verticalAlignment: "MIDDLE",
            horizontalAlignment: "LEFT",
            padding: { left: 10, right: 10 },
            wrapStrategy: "CLIP",
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,textFormat,verticalAlignment,horizontalAlignment,padding,wrapStrategy)",
      },
    },
    // Row 2: the header.
    {
      repeatCell: {
        range: range(1, 2),
        cell: {
          userEnteredFormat: {
            backgroundColor: C.mint,
            textFormat: { fontFamily: FONT, fontSize: 10, bold: true, foregroundColor: C.deepBlue },
            verticalAlignment: "MIDDLE",
            horizontalAlignment: "CENTER",
            wrapStrategy: "WRAP",
            borders: { bottom: { style: "SOLID_MEDIUM", colorStyle: { rgbColor: C.deepBlue } } },
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,textFormat,verticalAlignment,horizontalAlignment,wrapStrategy,borders)",
      },
    },
    // Data: plain text on white (old shading removed), the zebra comes from a rule below.
    {
      repeatCell: {
        range: range(DATA),
        cell: {
          userEnteredFormat: {
            backgroundColor: C.white,
            textFormat: { fontFamily: FONT, fontSize: 10, foregroundColor: C.charcoal },
            verticalAlignment: "MIDDLE",
            horizontalAlignment: "LEFT",
            wrapStrategy: "CLIP",
            numberFormat: { type: "TEXT" },
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,textFormat,verticalAlignment,horizontalAlignment,wrapStrategy,numberFormat)",
      },
    },
    ...money.map((column) => ({
      repeatCell: {
        range: range(DATA, undefined, column, column + 1),
        cell: {
          userEnteredFormat: {
            numberFormat: { type: "NUMBER", pattern: "#,##0" },
            horizontalAlignment: "RIGHT",
          },
        },
        fields: "userEnteredFormat(numberFormat,horizontalAlignment)",
      },
    })),
    ...wrap.map((column) => ({
      repeatCell: {
        range: range(DATA, undefined, column, column + 1),
        cell: { userEnteredFormat: { wrapStrategy: "WRAP" } },
        fields: "userEnteredFormat.wrapStrategy",
      },
    })),
    {
      updateBorders: {
        range: range(DATA, rows),
        innerHorizontal: { style: "SOLID", colorStyle: { rgbColor: C.hairline } },
        bottom: { style: "SOLID", colorStyle: { rgbColor: C.hairline } },
      },
    },
    ...widths.map((pixelSize, column) => ({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: column, endIndex: column + 1 },
        properties: { pixelSize },
        fields: "pixelSize",
      },
    })),
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 34 },
        fields: "pixelSize",
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 1, endIndex: 2 },
        properties: { pixelSize: 42 },
        fields: "pixelSize",
      },
    },
    // Conditional rules are ours: drop every existing one (last first), then add ours.
    ...Array.from({ length: state.conditionalFormats }, (_, i) => ({
      deleteConditionalFormatRule: { sheetId, index: state.conditionalFormats - 1 - i },
    })),
  ];
  const added = [
    ...rules.map((rule) => ({
      ranges: [range(DATA, undefined, rule.column, rule.column + 1)],
      booleanRule: {
        condition:
          "equals" in rule
            ? { type: "TEXT_EQ", values: [{ userEnteredValue: rule.equals }] }
            : { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: rule.formula }] },
        format: TONES[rule.tone],
      },
    })),
    // Zebra rows last: a status colour wins over it.
    {
      ranges: [range(DATA, rows)],
      booleanRule: {
        condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: "=ISEVEN(ROW())" }] },
        format: { backgroundColor: C.softWhite },
      },
    },
  ];
  added.forEach((rule, index) => requests.push({ addConditionalFormatRule: { rule, index } }));
  return requests;
}
