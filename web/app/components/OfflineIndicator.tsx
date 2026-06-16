"use client";

import { useEffect, useState } from "react";
import { useI18n } from "./I18nProvider";

export default function OfflineIndicator() {
  const { t } = useI18n();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 bg-yellow-200 px-4 py-2 text-center text-sm text-yellow-900"
    >
      {t("common.offline.message")}
    </div>
  );
}
