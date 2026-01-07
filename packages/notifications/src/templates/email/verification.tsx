import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout, globalStyles } from "../components/email-layout";

export interface VerificationEmailProps {
  userName: string;
  verificationUrl: string;
  expiresIn?: string;
  baseUrl?: string;
}

export function VerificationEmail({
  userName = "User",
  verificationUrl = "https://example.com/verify",
  expiresIn = "24 hours",
  baseUrl,
}: VerificationEmailProps) {
  return (
    <EmailLayout baseUrl={baseUrl} preview="Verify your email address">
      <Heading style={globalStyles.heading}>Verify Your Email</Heading>
      <Section style={globalStyles.section}>
        <Text style={globalStyles.text}>Hi {userName},</Text>
        <Text style={globalStyles.text}>
          Thanks for signing up! Please verify your email address by clicking
          the button below:
        </Text>
        <Button href={verificationUrl} style={globalStyles.button}>
          Verify Email Address
        </Button>
        <Text style={globalStyles.text}>
          This link will expire in {expiresIn}. If you didn't create an account,
          you can safely ignore this email.
        </Text>
        <Text style={globalStyles.mutedText}>
          If the button doesn't work, copy and paste this URL into your browser:{" "}
          {verificationUrl}
        </Text>
      </Section>
    </EmailLayout>
  );
}

export default VerificationEmail;
