import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface WelcomeEmailProps {
  userName: string;
  loginUrl?: string;
}

export function WelcomeEmail({
  userName,
  loginUrl = "https://example.com/login",
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to our platform!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Welcome, {userName}!</Heading>
          <Section style={section}>
            <Text style={text}>
              Thank you for joining us. We're excited to have you on board.
            </Text>
            <Text style={text}>
              To get started, you can{" "}
              <Link href={loginUrl} style={link}>
                log in to your account
              </Link>{" "}
              and explore all the features we have to offer.
            </Text>
            <Text style={text}>
              If you have any questions, feel free to reach out to our support
              team.
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

const link = {
  color: "#2563eb",
  textDecoration: "underline",
};

const footer = {
  color: "#666666",
  fontSize: "14px",
  lineHeight: "22px",
  marginTop: "32px",
  padding: "0 20px",
};

export default WelcomeEmail;
