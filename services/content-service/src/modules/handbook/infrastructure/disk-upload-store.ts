import { mkdir, open, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { UploadStore } from "../application/ports/import-ports";

const SAFE_ID = /^[0-9a-f]{24}$/;

/**
 * Upload files on the local disk (a Docker volume in production, ADR-0029). One
 * content-service instance owns the folder; files are named after the upload id only,
 * never after the person's file name.
 */
export class DiskUploadStore implements UploadStore {
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = dir || join(tmpdir(), "lavieco-handbook-uploads");
  }

  pathOf(uploadId: string) {
    if (!SAFE_ID.test(uploadId)) throw new Error("invalid upload id");
    return join(this.dir, `${uploadId}.bin`);
  }

  async write(uploadId: string, offset: number, bytes: Uint8Array) {
    await mkdir(this.dir, { recursive: true });
    const handle = await open(this.pathOf(uploadId), offset === 0 ? "w" : "r+");
    try {
      await handle.write(bytes, 0, bytes.byteLength, offset);
    } finally {
      await handle.close();
    }
  }

  async read(uploadId: string) {
    return new Uint8Array(await readFile(this.pathOf(uploadId)));
  }

  async size(uploadId: string) {
    try {
      return (await stat(this.pathOf(uploadId))).size;
    } catch {
      return -1;
    }
  }

  async remove(uploadId: string) {
    await rm(this.pathOf(uploadId), { force: true });
  }

  async sweep(cutoff: Date) {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch {
      return 0;
    }
    let removed = 0;
    for (const name of names) {
      const path = join(this.dir, name);
      const info = await stat(path).catch(() => null);
      if (info?.isFile() && info.mtime < cutoff) {
        await rm(path, { force: true });
        removed += 1;
      }
    }
    return removed;
  }
}
