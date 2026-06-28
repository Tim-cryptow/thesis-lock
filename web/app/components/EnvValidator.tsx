"use client";

import { useEffect } from "react";
import { validateEnv } from "@/lib/env";

// Validates the public environment once on mount. Unset variables only warn,
// since the app has working defaults; a present but malformed value throws from
// validateEnv and is caught by the surrounding error boundary, so a
// misconfigured deployment fails visibly instead of silently reading the wrong
// chain or contract. Renders nothing.
export default function EnvValidator() {
  useEffect(() => {
    validateEnv();
  }, []);

  return null;
}
