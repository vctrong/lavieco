import { unzipSync } from "fflate";

import { toSlug } from "@lavieco/shared";
import type { ImportJob } from "@lavieco/shared/shop";

/** Same key as program-service: no folder, no extension, accents and case removed. */
export function fileKey(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  return toSlug(base.replace(/\.[a-z0-9]+$/i, ""), 120);
}

const IMAGE = /\.(jpe?g|png|webp|heic|heif|avif)$/i;
const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Picked files, with every `.zip` opened here in the browser (the server never unzips:
 * no zip bomb, no huge upload). Non-image entries and macOS metadata are dropped.
 */
export async function expandFiles(files: readonly File[]): Promise<File[]> {
  const out: File[] = [];
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
        filter: (entry) => IMAGE.test(entry.name) && !entry.name.includes("__MACOSX"),
      });
      for (const [path, bytes] of Object.entries(entries)) {
        const name = path.split("/").pop() ?? path;
        const extension = name.split(".").pop()?.toLowerCase() ?? "";
        out.push(
          new File([new Uint8Array(bytes)], name, {
            type: MIME[extension] ?? "application/octet-stream",
          }),
        );
      }
    } else if (IMAGE.test(file.name)) {
      out.push(file);
    }
  }
  return out;
}

/**
 * Which picked files the rows use: names listed in column `anh`, or the `<slug>-<n>` /
 * `<sku>-<n>` convention. Returns the matched files and the listed names still missing.
 */
export function matchFiles(job: ImportJob, files: readonly File[]) {
  const wanted = new Set(job.wantedImages.map((w) => fileKey(w.fileName)));
  const prefixes = new Set<string>();
  for (const row of job.rows) {
    if (row.skipped) continue;
    if (row.slug) prefixes.add(row.slug);
    const sku = (row.raw.sku ?? "").trim();
    if (sku) prefixes.add(toSlug(sku, 60));
  }
  const uploaded = new Set(job.imageFiles.map((f) => fileKey(f.fileName)));
  const matched: File[] = [];
  const unmatched: File[] = [];
  for (const file of files) {
    const key = fileKey(file.name);
    if (uploaded.has(key)) continue;
    const byConvention = [...prefixes].some((prefix) => new RegExp(`^${prefix}-\\d+$`).test(key));
    (wanted.has(key) || byConvention ? matched : unmatched).push(file);
  }
  const have = new Set([...uploaded, ...matched.map((f) => fileKey(f.name))]);
  const missing = job.wantedImages.filter((w) => !have.has(fileKey(w.fileName)));
  return { matched, unmatched, missing };
}
