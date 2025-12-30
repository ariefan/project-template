import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
  expiresIn?: string;
}

export function PasswordResetEmail({
  userName,
  resetUrl,
  expiresIn = "1 hour",
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Password Reset Request</Heading>
          <Section style={section}>
            <Text style={text}>Hi {userName},</Text>
            <Text style={text}>
              We received a request to reset your password. Click the button
              below to create a new password:
            </Text>
            <Button href={resetUrl} style={button}>
              Reset Password
            </Button>
            <Text style={text}>
              This link will expire in {expiresIn}. If you didn't request a
              password reset, you can safely ignore this email.
            </Text>
            <Text style={mutedText}>
              If the button doesn't work, copy and paste this URL into your
              browser: {resetUrl}
            </Text>
          </Section>
          <Text style={footer}>
            Best regards,
            <br />
            The Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
  borderRadius: "8px",
};

const heading = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const section = {
  padding: "0 20px",
};

const text = {
  color: "#4a4a4a",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
};

const mutedText = {
  color: "#888888",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "16px 0",
  wordBreak: "break-all" as const,
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#ffffff",
  display: "block",
  fontSize: "16px",
  fontWeight: "600",
  padding: "12px 24px",
  textAlign: "center" as const,
  textDecoration: "none",
  margin: "24px auto",
};

const footer = {
  color: "#666666",
  fontSize: "14px",
  lineHeight: "22px",
  marginTop: "32px",
  padding: "0 20px",
};

export default PasswordResetEmail;
