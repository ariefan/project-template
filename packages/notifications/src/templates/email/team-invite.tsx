import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout, globalStyles } from "../components/email-layout";

export interface TeamInviteEmailProps {
  inviterName: string;
  teamName: string;
  inviteLink: string;
  role?: string;
  userImage?: string; // URL to avatar
  baseUrl?: string;
}

export function TeamInviteEmail({
  inviterName = "John Doe",
  teamName = "Acme Corp",
  inviteLink = "https://example.com/join/123",
  role = "member",
  baseUrl,
}: TeamInviteEmailProps) {
  const previewText = `Join ${inviterName} on ${teamName}`;

  return (
    <EmailLayout baseUrl={baseUrl} preview={previewText}>
      <Heading style={globalStyles.heading}>You've been invited!</Heading>
      <Section style={globalStyles.section}>
        <Text style={globalStyles.text}>Hi there,</Text>
        <Text style={globalStyles.text}>
          <strong>{inviterName}</strong> has invited you to join the{" "}
          <strong>{teamName}</strong> team as a <strong>{role}</strong>.
        </Text>
        <Section
          style={{
            textAlign: "center" as const,
            marginTop: "32px",
            marginBottom: "32px",
          }}
        >
          {/* Optional: Add avatars here if desired in future */}
        </Section>
        <Button href={inviteLink} style={globalStyles.button}>
          Join {teamName}
        </Button>
        <Text style={globalStyles.text}>
          This invitation button will remain active for 7 days.
        </Text>
        <Text style={globalStyles.mutedText}>
          If you were not expecting this invitation, you can simply ignore this
          email.
        </Text>
      </Section>
    </EmailLayout>
  );
}

export default TeamInviteEmail;
