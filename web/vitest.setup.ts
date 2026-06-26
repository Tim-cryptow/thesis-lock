// Shared setup for the Vitest suites. Registers the jest-dom matchers (and their
// types) for component assertions, and unmounts each rendered React tree after
// every test so the DOM and component state never leak across cases.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
