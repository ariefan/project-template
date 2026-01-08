import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react"; // Required for server-side rendering
import { EmailLayout, globalStyles } from "../components/email-layout";

export interface GenericNotificationEmailProps {
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
  baseUrl?: string;
}

export function GenericNotificationEmail({
  title = "Notification from Brand",
  body = "This is a notification to inform you about recent activity on your account.",
  actionLabel,
  actionUrl,
  baseUrl,
}: GenericNotificationEmailProps) {
  return (
    <EmailLayout baseUrl={baseUrl} preview={title}>
      <Heading style={globalStyles.heading}>{title}</Heading>
      <Section style={globalStyles.section}>
        {/* Simple split by newlines for basic formatting */}
        {body.split("\n").map(
          (paragraph) =>
            paragraph.trim() && (
              <Text key={paragraph} style={globalStyles.text}>
                {paragraph}
              </Text>
            )
        )}

        {actionLabel && actionUrl && (
          <Button href={actionUrl} style={globalStyles.button}>
            {actionLabel}
          </Button>
        )}
      </Section>
    </EmailLayout>
  );
}

export default GenericNotificationEmail;
