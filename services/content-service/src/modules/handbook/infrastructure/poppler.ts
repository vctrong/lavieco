import { execFile } from "node:child_process";

import { HANDBOOK_PAGE_PIXELS } from "@lavieco/shared/content";

import {
  PdfInvalidError,
  type PdfRenderer,
  type TextExtractor,
} from "../application/ports/import-ports";

/**
 * PDF pages through poppler-utils (ADR-0029): `pdfinfo`, `pdftoppm`, `pdftotext` run as
 * separate processes, one page at a time, with a timeout and a lower CPU priority so a
 * 48-page book never starves the API on a 2 vCPU server. Arguments are passed as an
 * array (no shell); the path is the upload store's own, never a user-chosen name.
 */

const PAGE_TIMEOUT_MS = 60_000;
const MAX_IMAGE_BYTES = 80 * 1024 * 1024;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;

type Run = { stdout: Buffer; stderr: string };

export class PopplerError extends Error {
  override name = "PopplerError";
}

function run(command: string, args: string[], maxBuffer: number): Promise<Run> {
  // On Linux (the server), `nice` lowers the priority; elsewhere (dev on Windows/macOS) run as is.
  const [file, argv] =
    process.platform === "linux" ? ["nice", ["-n", "10", command, ...args]] : [command, args];
  return new Promise((resolve, reject) => {
    execFile(
      file,
      argv,
      { encoding: "buffer", timeout: PAGE_TIMEOUT_MS, maxBuffer, windowsHide: true },
      (error, stdout, stderr) => {
        const text = stderr.toString("utf8");
        if (error) {
          const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
          reject(
            Object.assign(new PopplerError(missing ? "poppler not installed" : "poppler failed"), {
              stderr: text,
            }),
          );
          return;
        }
        resolve({ stdout, stderr: text });
      },
    );
  });
}

const stderrOf = (error: unknown) =>
  typeof error === "object" && error !== null && "stderr" in error ? String(error.stderr) : "";

export class PopplerPdfRenderer implements PdfRenderer {
  async inspect(path: string) {
    let output: Run;
    try {
      output = await run("pdfinfo", [path], 1024 * 1024);
    } catch (error) {
      if (error instanceof PopplerError && error.message === "poppler not installed") throw error;
      // A user password is needed to open it: we cannot read it, say so explicitly.
      if (/password/i.test(stderrOf(error))) throw new PdfInvalidError("pdf_encrypted");
      throw new PdfInvalidError("file_invalid");
    }
    const match = /^Pages:\s+(\d+)/m.exec(output.stdout.toString("utf8"));
    const pages = match ? Number(match[1]) : 0;
    if (pages < 1) throw new PdfInvalidError("file_invalid");
    return { pages };
  }

  async renderPage(path: string, page: number) {
    // 1748 px wide whatever the page size: A5 at 300 dpi, the recommended page size.
    const { stdout } = await run(
      "pdftoppm",
      [
        "-f",
        String(page),
        "-l",
        String(page),
        "-scale-to-x",
        String(HANDBOOK_PAGE_PIXELS.width),
        "-scale-to-y",
        "-1",
        "-png",
        "-singlefile",
        path,
      ],
      MAX_IMAGE_BYTES,
    );
    if (stdout.byteLength === 0) throw new PdfInvalidError("file_invalid");
    return new Uint8Array(stdout.buffer, stdout.byteOffset, stdout.byteLength);
  }
}

/** Collapses the layout whitespace of `pdftotext` into readable lines. */
export function tidyPdfText(raw: string): string {
  return raw
    .replace(/\f/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Text layer of a PDF page. Pages whose text was outlined, or scanned pages, give
 * nothing and are flagged "Thiếu chữ" for the editor to type.
 * TODO(handbook-ocr): an OCR implementation of `fromImage` (and of empty PDF pages)
 * plugs in here, behind the same `TextExtractor` port.
 */
export class PopplerTextExtractor implements TextExtractor {
  async fromPdfPage(path: string, page: number) {
    try {
      const { stdout } = await run(
        "pdftotext",
        ["-f", String(page), "-l", String(page), "-enc", "UTF-8", "-nopgbrk", path, "-"],
        MAX_TEXT_BYTES,
      );
      return tidyPdfText(stdout.toString("utf8"));
    } catch (error) {
      if (error instanceof PopplerError && error.message === "poppler not installed") throw error;
      // Text is a bonus: a page without readable text is still imported, flagged.
      return "";
    }
  }

  async fromImage() {
    return "";
  }
}
