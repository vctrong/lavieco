import { SignupPage, signupMetadata } from "@/features/auth";

export const metadata = signupMetadata;

export default async function DangKyPage({ searchParams }: PageProps<"/dang-ky">) {
  const params = await searchParams;
  return <SignupPage searchParams={{ tiep: first(params.tiep), loi: first(params.loi) }} />;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
