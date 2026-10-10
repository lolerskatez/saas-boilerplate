import { Button, Text } from "@react-email/components";

import { buttonStyle, EmailLayout, textStyle } from "./layout";

export default function VerifyEmail({ name = "there", url = "https://example.com" }: { name?: string; url?: string }) {
  return (
    <EmailLayout preview="Verify your email address">
      <Text style={textStyle}>Hi {name},</Text>
      <Text style={textStyle}>Confirm your email address to finish setting up your account.</Text>
      <Button href={url} style={buttonStyle}>
        Verify email
      </Button>
    </EmailLayout>
  );
}
