import { StaffLoginPage, loginMetadata } from "@/features/auth";

export const metadata = loginMetadata;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return <StaffLoginPage next={typeof next === "string" ? next : undefined} />;
}
