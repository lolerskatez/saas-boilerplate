import { Button, Text } from "@react-email/components";

import { buttonStyle, EmailLayout, textStyle } from "./layout";

export default function ResetPassword({
  name = "there",
  url = "https://example.com",
}: {
  name?: string;
  url?: string;
}) {
  return (
    <EmailLayout preview="Reset your password">
      <Text style={textStyle}>Hi {name},</Text>
      <Text style={textStyle}>Someone requested a password reset for your account. This link expires in one hour.</Text>
      <Button href={url} style={buttonStyle}>
        Reset password
      </Button>
    </EmailLayout>
  );
}
