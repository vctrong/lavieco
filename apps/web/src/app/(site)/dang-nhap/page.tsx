import { LoginPage, loginMetadata } from "@/features/auth";

export const metadata = loginMetadata;

export default async function DangNhapPage({ searchParams }: PageProps<"/dang-nhap">) {
  const params = await searchParams;
  return <LoginPage searchParams={{ tiep: first(params.tiep), loi: first(params.loi) }} />;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
