import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: process.env.SERVICE_NAME ?? "web" },
  redact: [
    "password",
    "token",
    "secret",
    "*.password",
    "*.token",
    "*.secret",
    "headers.authorization",
    "headers.cookie",
  ],
});
