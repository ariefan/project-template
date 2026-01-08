import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type * as React from "react"; // Required for server-side rendering

interface EmailLayoutProps {
  preview?: string;
  baseUrl?: string;
  children: React.ReactNode;
}

export const EmailLayout = ({
  preview,
  baseUrl = "http://localhost:3000",
  children,
}: EmailLayoutProps) => {
  return (
    <Html>
      <Head />
      {preview && <Preview>{preview}</Preview>}
      <Body style={main}>
        <Container style={container}>
          <Section style={logo}>
            <Img
              alt="Brand"
              height="37"
              src={`${baseUrl}/branding/logo/logo-default.svg`}
              width="150"
            />
          </Section>
          {children}
          <Text style={footer}>
            Best regards,
            <br />
            The Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

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

const logo = {
  margin: "0 auto",
  padding: "20px 0",
};

const footer = {
  color: "#666666",
  fontSize: "14px",
  lineHeight: "22px",
  marginTop: "32px",
  padding: "0 20px",
};

export const globalStyles = {
  heading: {
    color: "#1a1a1a",
    fontSize: "24px",
    fontWeight: "600",
    textAlign: "center" as const,
    margin: "0 0 24px",
  },
  section: {
    padding: "0 20px",
  },
  text: {
    color: "#4a4a4a",
    fontSize: "16px",
    lineHeight: "24px",
    margin: "16px 0",
  },
  link: {
    color: "#2563eb",
    textDecoration: "underline",
  },
  button: {
    backgroundColor: "#2563eb", // Default blue, verification used green #16a34a, maybe expose variant
    borderRadius: "6px",
    color: "#ffffff",
    display: "block",
    fontSize: "16px",
    fontWeight: "600",
    padding: "12px 24px",
    textAlign: "center" as const,
    textDecoration: "none",
    margin: "24px auto",
  },
  mutedText: {
    color: "#888888",
    fontSize: "12px",
    lineHeight: "20px",
    margin: "16px 0",
    wordBreak: "break-all" as const,
  },
  detailsBox: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fee2e2",
    borderRadius: "6px",
    padding: "16px",
    margin: "24px 0",
  },
  detailItem: {
    color: "#4a4a4a",
    fontSize: "14px",
    lineHeight: "20px",
    margin: "4px 0",
  },
};
