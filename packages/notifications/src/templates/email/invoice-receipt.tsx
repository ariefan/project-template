import {
  Button,
  Column,
  Heading,
  Hr,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react"; // Required for server-side rendering
import { EmailLayout, globalStyles } from "../components/email-layout";

export interface InvoiceItem {
  description: string;
  amount: string;
}

export interface InvoiceReceiptEmailProps {
  invoiceId: string;
  date: string;
  totalAmount: string;
  currency?: string;
  items: InvoiceItem[];
  downloadLink?: string;
  baseUrl?: string;
}

export function InvoiceReceiptEmail({
  invoiceId = "INV-001",
  date = "Jan 01, 2024",
  totalAmount = "$29.00",
  items = [{ description: "Pro Plan (Monthly)", amount: "$29.00" }],
  downloadLink = "https://example.com/invoices/123.pdf",
  baseUrl,
}: InvoiceReceiptEmailProps) {
  return (
    <EmailLayout baseUrl={baseUrl} preview={`Your receipt for ${invoiceId}`}>
      <Heading style={globalStyles.heading}>Receipt</Heading>
      <Section style={globalStyles.section}>
        <Text style={globalStyles.text}>Hi there,</Text>
        <Text style={globalStyles.text}>
          We received payment for your latest subscription period. Thank you for
          your business!
        </Text>
        <Section style={receiptContainer}>
          <Row>
            <Column>
              <Text style={receiptMetaLabel}>Date</Text>
              <Text style={receiptMetaValue}>{date}</Text>
            </Column>
            <Column align="right">
              <Text style={receiptMetaLabel}>Invoice #</Text>
              <Text style={receiptMetaValue}>{invoiceId}</Text>
            </Column>
          </Row>
        </Section>

        <Hr style={hr} />

        <Section style={itemList}>
          {(typeof items === "string" ? JSON.parse(items) : items).map(
            (item: InvoiceItem) => (
              <Row
                key={`${item.description}-${item.amount}`}
                style={{ marginBottom: "2px" }}
              >
                <Column>
                  <Text style={itemDescription}>{item.description}</Text>
                </Column>
                <Column align="right">
                  <Text style={itemAmount}>{item.amount}</Text>
                </Column>
              </Row>
            )
          )}
        </Section>

        <Hr style={hr} />

        <Row>
          <Column>
            <Text style={totalLabel}>Total</Text>
          </Column>
          <Column align="right">
            <Text style={totalAmountStyle}>{totalAmount}</Text>
          </Column>
        </Row>

        {downloadLink && (
          <Button href={downloadLink} style={globalStyles.button}>
            Download PDF
          </Button>
        )}
      </Section>
    </EmailLayout>
  );
}

const receiptContainer = {
  marginTop: "24px",
};

const receiptMetaLabel = {
  color: "#666666",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  marginBottom: "4px",
};

const receiptMetaValue = {
  color: "#1a1a1a",
  fontSize: "14px",
  fontWeight: "500",
  margin: "0",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "8px 0",
};

const itemList = {
  margin: "8px 0",
};

const itemDescription = {
  fontSize: "14px",
  color: "#4a4a4a",
  margin: "0",
};

const itemAmount = {
  fontSize: "14px",
  color: "#1a1a1a",
  fontWeight: "500",
  margin: "0",
};

const totalLabel = {
  fontSize: "16px",
  color: "#4a4a4a",
  fontWeight: "600",
  margin: "0",
};

const totalAmountStyle = {
  fontSize: "18px",
  color: "#1a1a1a",
  fontWeight: "700",
  margin: "0",
};

export default InvoiceReceiptEmail;
