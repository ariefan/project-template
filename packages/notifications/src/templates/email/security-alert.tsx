import { Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout, globalStyles } from "../components/email-layout";

export interface SecurityAlertEmailProps {
  userName: string;
  alertType: "new_login" | "password_changed" | "email_changed" | "suspicious";
  ipAddress?: string;
  location?: string;
  device?: string;
  timestamp?: string;
  actionUrl?: string;
  baseUrl?: string;
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
  userName = "User",
  alertType = "new_login",
  ipAddress,
  location,
  device,
  timestamp,
  actionUrl = "https://example.com/security",
  baseUrl,
}: SecurityAlertEmailProps) {
  const alert = alertMessages[alertType];

  return (
    <EmailLayout baseUrl={baseUrl} preview={alert.title}>
      <Heading
        style={{ ...globalStyles.heading, color: "#dc2626" }} // Keep warning color
      >
        ⚠️ {alert.title}
      </Heading>
      <Section style={globalStyles.section}>
        <Text style={globalStyles.text}>Hi {userName},</Text>
        <Text style={globalStyles.text}>{alert.description}</Text>

        <Section style={globalStyles.detailsBox}>
          {Boolean(timestamp) && (
            <Text style={globalStyles.detailItem}>
              <strong>Time:</strong> {timestamp}
            </Text>
          )}
          {Boolean(ipAddress) && (
            <Text style={globalStyles.detailItem}>
              <strong>IP Address:</strong> {ipAddress}
            </Text>
          )}
          {Boolean(location) && (
            <Text style={globalStyles.detailItem}>
              <strong>Location:</strong> {location}
            </Text>
          )}
          {Boolean(device) && (
            <Text style={globalStyles.detailItem}>
              <strong>Device:</strong> {device}
            </Text>
          )}
        </Section>

        <Text style={globalStyles.text}>
          If this was you, no further action is needed. If you didn't perform
          this action, please{" "}
          <Link href={actionUrl} style={globalStyles.link}>
            review your account security
          </Link>{" "}
          immediately.
        </Text>
      </Section>
    </EmailLayout>
  );
}

export default SecurityAlertEmail;
