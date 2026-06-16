"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ErrorFallback from "./ErrorFallback";
import { useI18n } from "./I18nProvider";

type ErrorBoundaryProps = {
  children: ReactNode;
  // Changes whenever the route changes. The class boundary clears its captured
  // error when this differs, so navigating away (e.g. via "Go home") recovers
  // instead of leaving the fallback stuck across route changes.
  pathname: string;
  // Translated copy is resolved in the function wrapper and passed in, since a
  // class component cannot call the useI18n hook itself.
  message: string;
  homeLabel: string;
};

type ErrorBoundaryState = {
  error: Error | null;
};

class ErrorBoundaryInner extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.pathname !== this.props.pathname) {
      this.setState({ error: null });
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <ErrorFallback message={this.props.message} onRetry={this.reset} />
        {process.env.NODE_ENV !== "production" && (
          <pre className="mt-4 overflow-auto rounded-lg border border-foreground/10 bg-card p-4 text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
            {error.message}
          </pre>
        )}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-foreground/60 hover:text-foreground underline hover:no-underline"
          >
            {this.props.homeLabel}
          </Link>
        </div>
      </div>
    );
  }
}

export default function ErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <ErrorBoundaryInner
      pathname={pathname}
      message={t("common.error.boundaryMessage")}
      homeLabel={t("common.actions.goHome")}
    >
      {children}
    </ErrorBoundaryInner>
  );
}
