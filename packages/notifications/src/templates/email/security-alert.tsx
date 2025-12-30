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

export interface SecurityAlertEmailProps {
  userName: string;
  alertType: "new_login" | "password_changed" | "email_changed" | "suspicious";
  ipAddress?: string;
  location?: string;
  device?: string;
  timestamp?: string;
  actionUrl?: string;
}

const alertMessages = {
  new_login: {
    title: "New Login Detected",
    description: "We noticed a new login to your account.",
  },
  password_changed: {
    title: "Password Changed",
    description: "Your account password was recently changed.",
  },
  email_changed: {
    title: "Email Address Changed",
    description: "The email address associated with your account was changed.",
  },
  suspicious: {
    title: "Suspicious Activity Detected",
    description:
      "We detected unusual activity on your account that may require your attention.",
  },
};

export function SecurityAlertEmail({
  userName,
  alertType,
  ipAddress,
  location,
  device,
  timestamp,
  actionUrl = "https://example.com/security",
}: SecurityAlertEmailProps) {
  const alert = alertMessages[alertType];

  return (
    <Html>
      <Head />
      <Preview>{alert.title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>⚠️ {alert.title}</Heading>
          <Section style={section}>
            <Text style={text}>Hi {userName},</Text>
            <Text style={text}>{alert.description}</Text>

            <Section style={detailsBox}>
              {Boolean(timestamp) && (
                <Text style={detailItem}>
                  <strong>Time:</strong> {timestamp}
                </Text>
              )}
              {Boolean(ipAddress) && (
                <Text style={detailItem}>
                  <strong>IP Address:</strong> {ipAddress}
                </Text>
              )}
              {Boolean(location) && (
                <Text style={detailItem}>
                  <strong>Location:</strong> {location}
                </Text>
              )}
              {Boolean(device) && (
                <Text style={detailItem}>
                  <strong>Device:</strong> {device}
                </Text>
              )}
            </Section>

            <Text style={text}>
              If this was you, no further action is needed. If you didn't
              perform this action, please{" "}
              <Link href={actionUrl} style={link}>
                review your account security
              </Link>{" "}
              immediately.
            </Text>
          </Section>
          <Text style={footer}>
            This is an automated security alert.
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
  color: "#dc2626",
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

const detailsBox = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fee2e2",
  borderRadius: "6px",
  padding: "16px",
  margin: "24px 0",
};

const detailItem = {
  color: "#4a4a4a",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0",
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

export default SecurityAlertEmail;
