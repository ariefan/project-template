import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react"; // Required for server-side rendering
import { EmailLayout, globalStyles } from "../components/email-layout";

export interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
  expiresIn?: string;
  baseUrl?: string;
}

export function PasswordResetEmail({
  userName = "User",
  resetUrl = "https://example.com/reset",
  expiresIn = "1 hour",
  baseUrl,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout baseUrl={baseUrl} preview="Reset your password">
      <Heading style={globalStyles.heading}>Password Reset Request</Heading>
      <Section style={globalStyles.section}>
        <Text style={globalStyles.text}>Hi {userName},</Text>
        <Text style={globalStyles.text}>
          We received a request to reset your password. Click the button below
          to create a new password:
        </Text>
        <Button href={resetUrl} style={globalStyles.button}>
          Reset Password
        </Button>
        <Text style={globalStyles.text}>
          This link will expire in {expiresIn}. If you didn't request a password
          reset, you can safely ignore this email.
        </Text>
        <Text style={globalStyles.mutedText}>
          If the button doesn't work, copy and paste this URL into your browser:{" "}
          {resetUrl}
        </Text>
      </Section>
    </EmailLayout>
  );
}

export default PasswordResetEmail;
