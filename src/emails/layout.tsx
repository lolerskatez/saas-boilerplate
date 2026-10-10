import { Body, Container, Head, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Acme SaaS";

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f6f6f6", fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Container
          style={{ backgroundColor: "#ffffff", borderRadius: 8, margin: "40px auto", padding: 32, maxWidth: 520 }}
        >
          <Text style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{appName}</Text>
          <Section style={{ marginTop: 24 }}>{children}</Section>
          <Hr style={{ borderColor: "#eaeaea", margin: "32px 0 16px" }} />
          <Text style={{ color: "#8a8a8a", fontSize: 12 }}>
            You received this email because of an action on {appName}. If this wasn&apos;t you, you can ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const buttonStyle = {
  backgroundColor: "#111111",
  borderRadius: 6,
  color: "#ffffff",
  display: "inline-block",
  fontSize: 14,
  fontWeight: 600,
  padding: "12px 20px",
  textDecoration: "none",
} as const;

export const textStyle = { color: "#333333", fontSize: 14, lineHeight: "24px" } as const;
