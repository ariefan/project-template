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

export type VerificationEmailProps = {
  userName: string;
  verificationUrl: string;
  expiresIn?: string;
};

export function VerificationEmail({
  userName,
  verificationUrl,
  expiresIn = "24 hours",
}: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Verify Your Email</Heading>
          <Section style={section}>
            <Text style={text}>Hi {userName},</Text>
            <Text style={text}>
              Thanks for signing up! Please verify your email address by
              clicking the button below:
            </Text>
            <Button href={verificationUrl} style={button}>
              Verify Email Address
            </Button>
            <Text style={text}>
              This link will expire in {expiresIn}. If you didn't create an
              account, you can safely ignore this email.
            </Text>
            <Text style={mutedText}>
              If the button doesn't work, copy and paste this URL into your
              browser: {verificationUrl}
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
  backgroundColor: "#16a34a",
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

export default VerificationEmail;
