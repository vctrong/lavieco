import { notFound } from "next/navigation";

/**
 * Any URL no route of the site matches: answers 404 through `(site)/not-found.tsx`, so
 * the visitor keeps the navigation and footer (the root not-found has neither).
 */
export default function MissingPage(): never {
  notFound();
}
