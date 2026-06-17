"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import Footer from "@/app/components/Footer";
import { useI18n } from "@/app/components/I18nProvider";
import EndpointSelector from "@/app/components/playground/EndpointSelector";
import ParameterForm from "@/app/components/playground/ParameterForm";
import CurlPreview from "@/app/components/playground/CurlPreview";
import {
  ALL_ENDPOINTS,
  initialValues,
  type Endpoint,
} from "@/app/components/playground/endpoints";

export default function PlaygroundClient() {
  const { t } = useI18n();
  const [endpoint, setEndpoint] = useState<Endpoint>(ALL_ENDPOINTS[0]);
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(ALL_ENDPOINTS[0]),
  );

  // Selecting a new endpoint resets the form to that endpoint's defaults so no
  // stale parameter from the previous endpoint leaks into the next request.
  const selectEndpoint = useCallback((next: Endpoint) => {
    setEndpoint(next);
    setValues(initialValues(next));
  }, []);

  const setValue = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  return (
    <>
      <div className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="order-last ml-auto">
            <ThemeToggle />
          </div>
          <Link href="/" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.back")}
          </Link>
          <Link
            href="/docs"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.docs")}
          </Link>
          <Link
            href="/docs/api"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.api")}
          </Link>
          <span className="text-foreground font-medium">Developers</span>
        </div>

        <header className="mt-8 mb-8">
          <h1 className="text-3xl mb-2">ThesisLock API Playground</h1>
          <p className="text-foreground/70 max-w-2xl">
            Test API endpoints interactively
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-8">
          <aside>
            <EndpointSelector
              selectedId={endpoint.id}
              onSelect={selectEndpoint}
            />
          </aside>
          <section className="min-w-0 flex flex-col gap-6">
            <ParameterForm
              endpoint={endpoint}
              values={values}
              onChange={setValue}
              onSubmit={() => {}}
              loading={false}
            />
            <CurlPreview endpoint={endpoint} values={values} />
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
