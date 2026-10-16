import { AcceptInvitePage, inviteMetadata } from "@/features/auth";

export const metadata = inviteMetadata;

export default async function AcceptInviteRoute({ searchParams }: PageProps<"/accept-invite">) {
  const { token } = await searchParams;
  return <AcceptInvitePage token={typeof token === "string" ? token : undefined} />;
}
