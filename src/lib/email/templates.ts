import type { ComponentProps, ReactElement } from "react";

import Invitation from "@/emails/invitation";
import NotificationEmail from "@/emails/notification";
import ResetPassword from "@/emails/reset-password";
import VerifyEmail from "@/emails/verify-email";

/**
 * Registry of email templates. Jobs carry only `{ template, props }` (JSON-serializable),
 * and the worker renders the React Email component at send time.
 */
export const emailTemplates = {
  "verify-email": {
    subject: () => "Verify your email address",
    render: (p: ComponentProps<typeof VerifyEmail>) => VerifyEmail(p),
  },
  "reset-password": {
    subject: () => "Reset your password",
    render: (p: ComponentProps<typeof ResetPassword>) => ResetPassword(p),
  },
  invitation: {
    subject: (p: ComponentProps<typeof Invitation>) => `You're invited to join ${p.organizationName}`,
    render: (p: ComponentProps<typeof Invitation>) => Invitation(p),
  },
  notification: {
    subject: (p: ComponentProps<typeof NotificationEmail>) => p.title ?? "Notification",
    render: (p: ComponentProps<typeof NotificationEmail>) => NotificationEmail(p),
  },
} satisfies Record<string, { subject: (p: never) => string; render: (p: never) => ReactElement }>;

export type EmailTemplate = keyof typeof emailTemplates;
export type EmailProps<T extends EmailTemplate> = Parameters<(typeof emailTemplates)[T]["render"]>[0];
