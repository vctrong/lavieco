"use client"; // Error boundaries must be Client Components

import { ServerErrorView } from "@/features/server-error";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ServerErrorView error={error} retry={retry} />;
}
