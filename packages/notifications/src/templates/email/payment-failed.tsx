import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react"; // Required for server-side rendering
import { EmailLayout, globalStyles } from "../components/email-layout";

export interface PaymentFailedEmailProps {
  last4: string;
  nextRetryDate?: string;
  amount: string;
  actionUrl: string;
  baseUrl?: string;
}

export function PaymentFailedEmail({
  last4 = "1234",
  nextRetryDate = "tomorrow",
  amount = "$29.00",
  actionUrl = "https://example.com/settings/billing",
  baseUrl,
}: PaymentFailedEmailProps) {
  return (
    <EmailLayout baseUrl={baseUrl} preview="Action required: Payment failed">
      <Heading
        style={{ ...globalStyles.heading, color: "#dc2626" }} // Alert color
      >
        Payment Failed
      </Heading>
      <Section style={globalStyles.section}>
        <Text style={globalStyles.text}>Hi there,</Text>
        <Text style={globalStyles.text}>
          We were unable to charge your card ending in <strong>{last4}</strong>{" "}
          for the amount of <strong>{amount}</strong>.
        </Text>
        <Text style={globalStyles.text}>
          Don't worry, your subscription is still active for now. We will try to
          charge your card again{" "}
          {nextRetryDate === "tomorrow" ? "tomorrow" : `on ${nextRetryDate}`}.
        </Text>
        <Text style={globalStyles.text}>
          To prevent any interruption in your service, please update your
          payment method as soon as possible.
        </Text>
        <Button href={actionUrl} style={globalStyles.button}>
          Update Payment Method
        </Button>
      </Section>
    </EmailLayout>
  );
}

export default PaymentFailedEmail;
