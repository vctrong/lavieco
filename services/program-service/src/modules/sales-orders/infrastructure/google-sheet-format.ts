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
  attention: {
    backgroundColor: C.canarySoft,
    textFormat: { foregroundColor: C.charcoal, bold: true },
  },
  alert: { textFormat: { foregroundColor: C.error, bold: true } },
  info: { backgroundColor: C.hairline, textFormat: { foregroundColor: C.deepBlue, bold: true } },
};

const FONT = "Be Vietnam Pro";

/**
 * Update field mask: the API takes full paths (`userEnteredFormat.a,userEnteredFormat.b`);
 * the `userEnteredFormat(a,b)` shorthand of read masks is refused on write.
 */
const fields = (keys: string) =>
  keys
    .split(",")
    .map((key) => `userEnteredFormat.${key.trim()}`)
    .join(",");
const DATA = SHEET_DATA_ROW - 1; // 0-based index of the first data row
const TITLE_SIZE = 16;

/**
 * Requests that give a tab its look (ADR-0030, BR-29): a large title band in row 1 (title
 * and update time big, the read-only note small), an emerald header in row 2, frozen rows,
 * widths, alignment, money format, dropdown chips listing exactly the labels the app
 * writes (full staff names for the assignee), zebra rows and status colours. Idempotent:
 * dropdowns and conditional rules are replaced each time, so a hand edit of the
 * presentation never sticks and an old list never flags a new value.
 */
export function formatRequests(tab: SheetTab, state: SheetState): unknown[] {
  const { sheetId } = state;
  const { widths, money, center, wrap, frozenColumns, choices, rules } = tab.layout;
  const columns = widths.length;
  const rows = Math.max(tab.rows.length, SHEET_DATA_ROW);
  const range = (startRowIndex: number, endRowIndex?: number, startCol = 0, endCol = columns) => ({
    sheetId,
    startRowIndex,
    ...(endRowIndex === undefined ? {} : { endRowIndex }),
    startColumnIndex: startCol,
    endColumnIndex: endCol,
  });
  const cells = (cols: number[], format: Record<string, unknown>, fields: string) =>
    cols.map((column) => ({
      repeatCell: {
        range: range(DATA, undefined, column, column + 1),
        cell: { userEnteredFormat: format },
        fields,
      },
    }));
  const titleText = tab.title.main + tab.title.sub;

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
    // Old dropdowns go first (anywhere on the tab); ours are set again below.
    { setDataValidation: { range: { sheetId } } },

    // Row 1: one merged band, title and time in large type, the note smaller.
    { unmergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 } } },
    { mergeCells: { range: range(0, 1), mergeType: "MERGE_ALL" } },
    {
      updateCells: {
        range: range(0, 1, 0, 1),
        rows: [
          {
            values: [
              {
                userEnteredValue: { stringValue: titleText },
                userEnteredFormat: {
                  backgroundColor: C.deepBlue,
                  verticalAlignment: "MIDDLE",
                  horizontalAlignment: "LEFT",
                  wrapStrategy: "OVERFLOW_CELL",
                  padding: { left: 14, right: 14, top: 6, bottom: 6 },
                  textFormat: { fontFamily: FONT, foregroundColor: C.white },
                },
                textFormatRuns: [
                  {
                    startIndex: 0,
                    format: {
                      fontFamily: FONT,
                      fontSize: TITLE_SIZE,
                      bold: true,
                      foregroundColor: C.white,
                    },
                  },
                  {
                    startIndex: tab.title.main.length,
                    format: {
                      fontFamily: FONT,
                      fontSize: 10,
                      bold: false,
                      italic: true,
                      foregroundColor: C.mint,
                    },
                  },
                ],
              },
            ],
          },
        ],
        fields: "userEnteredValue,userEnteredFormat,textFormatRuns",
      },
    },
    {
      repeatCell: {
        range: range(0, 1, 1, columns),
        cell: { userEnteredFormat: { backgroundColor: C.deepBlue } },
        fields: "userEnteredFormat.backgroundColor",
      },
    },

    // Row 2: the header, white bold on emerald ink (AA), centred, wrapping.
    {
      repeatCell: {
        range: range(1, 2),
        cell: {
          userEnteredFormat: {
            backgroundColor: C.emeraldInk,
            textFormat: { fontFamily: FONT, fontSize: 10, bold: true, foregroundColor: C.white },
            verticalAlignment: "MIDDLE",
            horizontalAlignment: "CENTER",
            wrapStrategy: "WRAP",
            padding: { left: 6, right: 6, top: 4, bottom: 4 },
            borders: {
              bottom: { style: "SOLID_MEDIUM", colorStyle: { rgbColor: C.deepBlue } },
              right: { style: "SOLID", colorStyle: { rgbColor: C.white } },
            },
          },
        },
        fields: fields(
          "backgroundColor,textFormat,verticalAlignment,horizontalAlignment,wrapStrategy,padding,borders",
        ),
      },
    },

    // Data: plain text on white (old shading removed); zebra and colours come from rules.
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
            padding: { left: 6, right: 6, top: 4, bottom: 4 },
            numberFormat: { type: "TEXT" },
          },
        },
        fields: fields(
          "backgroundColor,textFormat,verticalAlignment,horizontalAlignment,wrapStrategy,padding,numberFormat",
        ),
      },
    },
    ...cells(
      money,
      { numberFormat: { type: "NUMBER", pattern: "#,##0" }, horizontalAlignment: "RIGHT" },
      fields("numberFormat,horizontalAlignment"),
    ),
    ...cells(center, { horizontalAlignment: "CENTER" }, "userEnteredFormat.horizontalAlignment"),
    ...cells(wrap, { wrapStrategy: "WRAP" }, "userEnteredFormat.wrapStrategy"),
    // The code column reads as the key of each line.
    ...cells(
      [0],
      { textFormat: { fontFamily: FONT, fontSize: 10, bold: true, foregroundColor: C.deepBlue } },
      "userEnteredFormat.textFormat",
    ),
    {
      updateBorders: {
        range: range(DATA, rows),
        innerHorizontal: { style: "SOLID", colorStyle: { rgbColor: C.hairline } },
        bottom: { style: "SOLID", colorStyle: { rgbColor: C.hairline } },
      },
    },

    // Dropdown chips with exactly the labels the app writes (read only: not strict).
    ...choices
      .filter((choice) => choice.values.length > 0)
      .map((choice) => ({
        setDataValidation: {
          range: range(DATA, undefined, choice.column, choice.column + 1),
          rule: {
            condition: {
              type: "ONE_OF_LIST",
              values: choice.values.map((value) => ({ userEnteredValue: value })),
            },
            showCustomUi: true,
            strict: false,
          },
        },
      })),

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
        properties: { pixelSize: 52 },
        fields: "pixelSize",
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 1, endIndex: 2 },
        properties: { pixelSize: 44 },
        fields: "pixelSize",
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: DATA, endIndex: rows },
        properties: { pixelSize: 34 },
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
