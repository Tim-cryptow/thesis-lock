import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HashInput, { sanitizeHash } from "@/app/components/HashInput";

const H = "a".repeat(64);

describe("sanitizeHash", () => {
  it("strips a leading 0x prefix", () => {
    expect(sanitizeHash("0xABCDEF")).toBe("abcdef");
  });

  it("strips a leading 0X prefix regardless of case", () => {
    expect(sanitizeHash("0XAbCd")).toBe("abcd");
  });

  it("removes whitespace and newlines", () => {
    expect(sanitizeHash("  ab cd\nef ")).toBe("abcdef");
  });

  it("lowercases the value", () => {
    expect(sanitizeHash("ABCDEF")).toBe("abcdef");
  });
});

describe("HashInput", () => {
  it("passes the sanitized value to onChange", () => {
    const onChange = vi.fn();
    render(<HashInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "0xABCDEF" },
    });
    expect(onChange).toHaveBeenCalledWith("abcdef");
  });

  it("renders the default label", () => {
    render(<HashInput value="" onChange={() => {}} />);
    expect(screen.getByText("Document hash")).toBeInTheDocument();
  });

  it("shows the valid message for a 64-character hex hash", () => {
    render(<HashInput value={H} onChange={() => {}} />);
    expect(screen.getByText("Valid SHA-256 hash")).toBeInTheDocument();
  });

  it("shows an error after blur on an invalid value", () => {
    render(<HashInput value="xyz" onChange={() => {}} />);
    fireEvent.blur(screen.getByRole("textbox"));
    expect(screen.getByRole("alert")).toHaveTextContent(/64 hexadecimal/);
  });
});
