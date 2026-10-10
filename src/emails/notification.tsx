import { Button, Text } from "@react-email/components";

import { buttonStyle, EmailLayout, textStyle } from "./layout";

export default function NotificationEmail({
  title = "Update",
  body = "Something happened.",
  url,
}: {
  title?: string;
  body?: string;
  url?: string;
}) {
  return (
    <EmailLayout preview={title}>
      <Text style={{ ...textStyle, fontSize: 16, fontWeight: 600 }}>{title}</Text>
      <Text style={textStyle}>{body}</Text>
      {url ? (
        <Button href={url} style={buttonStyle}>
          Open
        </Button>
      ) : null}
    </EmailLayout>
  );
}
