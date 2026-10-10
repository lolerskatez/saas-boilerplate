"use client";

import { adminClient, organizationClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { ac, roles } from "./permissions";

export const authClient = createAuthClient({
  plugins: [
    organizationClient({ ac, roles }),
    adminClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- runs outside React, no router available
        window.location.href = "/two-factor";
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
