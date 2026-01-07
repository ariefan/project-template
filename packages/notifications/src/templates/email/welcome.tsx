import { Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout, globalStyles } from "../components/email-layout";

export interface WelcomeEmailProps {
  userName: string;
  loginUrl?: string;
  baseUrl?: string;
}

export function WelcomeEmail({
  userName = "User",
  loginUrl = "https://example.com/login",
  baseUrl,
}: WelcomeEmailProps) {
  return (
    <EmailLayout baseUrl={baseUrl} preview="Welcome to our platform!">
      <Heading style={globalStyles.heading}>Welcome, {userName}!</Heading>
      <Section style={globalStyles.section}>
        <Text style={globalStyles.text}>
          Thank you for joining us. We're excited to have you on board.
        </Text>
        <Text style={globalStyles.text}>
          To get started, you can{" "}
          <Link href={loginUrl} style={globalStyles.link}>
            log in to your account
          </Link>{" "}
          and explore all the features we have to offer.
        </Text>
        <Text style={globalStyles.text}>
          If you have any questions, feel free to reach out to our support team.
        </Text>
      </Section>
    </EmailLayout>
  );
}

export default WelcomeEmail;
