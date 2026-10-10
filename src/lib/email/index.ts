import { render } from "@react-email/components";
import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

import { emailTemplates, type EmailProps, type EmailTemplate } from "./templates";

export interface SendEmailInput<T extends EmailTemplate = EmailTemplate> {
  to: string;
  template: T;
  props: EmailProps<T>;
}

let smtp: Transporter | undefined;
let resend: Resend | undefined;

/** Renders and delivers an email via Resend (if configured), SMTP, or the logger as a fallback. */
export async function deliverEmail<T extends EmailTemplate>({ to, template, props }: SendEmailInput<T>) {
  const def = emailTemplates[template] as unknown as {
    subject: (p: EmailProps<T>) => string;
    render: (p: EmailProps<T>) => React.ReactElement;
  };
  const subject = def.subject(props);
  const element = def.render(props);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);

  if (env.RESEND_API_KEY) {
    resend ??= new Resend(env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html, text });
    if (error) throw new Error(`Resend error: ${error.message}`);
  } else if (env.SMTP_URL) {
    smtp ??= nodemailer.createTransport(env.SMTP_URL);
    await smtp.sendMail({ from: env.EMAIL_FROM, to, subject, html, text });
  } else {
    logger.warn({ to, subject, text }, "No email transport configured; email logged instead of sent");
    return;
  }
  logger.info({ to, template }, "Email sent");
}
