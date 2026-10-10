import { Button, Text } from "@react-email/components";

import { buttonStyle, EmailLayout, textStyle } from "./layout";

export default function Invitation({
  inviterName = "A teammate",
  organizationName = "Acme",
  role = "member",
  url = "https://example.com",
}: {
  inviterName?: string;
  organizationName?: string;
  role?: string;
  url?: string;
}) {
  return (
    <EmailLayout preview={`Join ${organizationName}`}>
      <Text style={textStyle}>
        {inviterName} invited you to join <strong>{organizationName}</strong> as {role}.
      </Text>
      <Button href={url} style={buttonStyle}>
        Accept invitation
      </Button>
    </EmailLayout>
  );
}
