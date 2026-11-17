import "server-only";

import { isServiceProblem, type DownloadedFile } from "@lavieco/api-clients";
import { IMPORT_LIMITS, importModeSchema } from "@lavieco/shared/shop";

import { requestId } from "@/lib/request-meta";
import { adminLogger, programClient } from "@/lib/services";
import { withStaffToken } from "@/lib/staff-token";

import { callShop } from "./shop";

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** `POST /api/shop/import`: the spreadsheet goes to program-service as is (no 1 MB action cap). */
export async function handleImportUpload(request: Request): Promise<Response> {
  if (Number(request.headers.get("content-length") ?? "0") > IMPORT_LIMITS.fileBytes + 64 * 1024) {
    return json({ status: "error", reason: "file_invalid" }, 400);
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ status: "error", reason: "file_invalid" }, 400);
  }
  const file = form.get("file");
  const mode = importModeSchema.safeParse(form.get("mode"));
  if (!(file instanceof File) || !mode.success || !/\.(xlsx|csv)$/i.test(file.name)) {
    return json({ status: "error", reason: "file_invalid" }, 400);
  }
  const result = await callShop("shop.import.upload", (token, id) =>
    programClient().uploadImport(token, { bytes: file, filename: file.name }, mode.data, id),
  );
  if (result.status === "ok") return json({ status: "ok", job: result.data }, 201);
  return json(result, result.status === "error" && result.reason === "session_expired" ? 401 : 400);
}

/** Template and product export: binary responses streamed back to the browser. */
export async function handleShopDownload(kind: "template" | "export"): Promise<Response> {
  const id = await requestId();
  try {
    const call = await withStaffToken<DownloadedFile>(id, (token) =>
      kind === "template"
        ? programClient().downloadImportTemplate(token, id)
        : programClient().exportProducts(token, id),
    );
    if (call.session === "expired") return json({ reason: "session_expired" }, 401);
    const file = call.value;
    return new Response(file.body, {
      headers: {
        "content-type": file.contentType,
        "content-disposition": `attachment; filename="${file.fileName ?? "LAVIECO.xlsx"}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    adminLogger().warn("shop download failed", {
      kind,
      requestId: id,
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
    });
    const status = isServiceProblem(error) && error.status === 403 ? 403 : 503;
    return json({ reason: status === 403 ? "forbidden" : "unavailable" }, status);
  }
}
