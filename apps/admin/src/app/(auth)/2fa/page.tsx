import { SecondFactorPage, secondFactorMetadata } from "@/features/auth";

export const metadata = secondFactorMetadata;

export default async function TwoFactorPage({ searchParams }: PageProps<"/2fa">) {
  const { next } = await searchParams;
  return <SecondFactorPage next={typeof next === "string" ? next : undefined} />;
}
