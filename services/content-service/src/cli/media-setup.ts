import { v2 as cloudinary } from "cloudinary";

import {
  MEDIA_DELIVERY_WIDTHS,
  mediaTransformationDefinition,
  mediaTransformationName,
} from "@lavieco/shared/media";

import { loadContentEnv } from "../config/env";

/**
 * `npm run media:setup -w @lavieco/content-service`: creates (or updates) the named
 * transformations that apps use to show images, each allowed under "Strict
 * transformations" (ADR-0020). Idempotent. Turning Strict transformations ON is a
 * manual step in the Cloudinary console (docs/runbooks/chay-local.md §2.1).
 */
async function main() {
  const env = loadContentEnv();
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  for (const width of MEDIA_DELIVERY_WIDTHS) {
    const name = mediaTransformationName(width);
    const definition = mediaTransformationDefinition(width);
    try {
      await cloudinary.api.create_transformation(name, definition, { allowed_for_strict: true });
      console.log(`created t_${name} = ${definition}`);
    } catch {
      // Already there (or a transient error): make it match, which also proves access.
      await cloudinary.api.update_transformation(name, {
        unsafe_update: definition,
        allowed_for_strict: true,
      });
      console.log(`updated t_${name} = ${definition}`);
    }
  }
  console.log("named transformations ready; check that Strict transformations is ON");
}

void main().catch((error: unknown) => {
  console.error("media setup failed:", error instanceof Error ? error.name : "unknown");
  process.exitCode = 1;
});
