import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ValidatedInput from "@/app/components/ValidatedInput";
import { validateHash } from "@/lib/validators";

const H = "a".repeat(64);

describe("ValidatedInput", () => {
  it("renders the label", () => {
    render(<ValidatedInput value="" onChange={() => {}} label="Document hash" />);
    expect(screen.getByText("Document hash")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("marks a required field with an asterisk", () => {
    render(<ValidatedInput value="" onChange={() => {}} label="Name" required />);
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("shows a character counter against maxLength", () => {
    render(
      <ValidatedInput value="abc" onChange={() => {}} label="L" maxLength={64} />,
    );
    expect(screen.getByText("3/64")).toBeInTheDocument();
  });

  it("shows an error after blur on an invalid value", () => {
    render(
      <ValidatedInput
        value="xyz"
        onChange={() => {}}
        validator={validateHash}
        label="Hash"
      />,
    );
    fireEvent.blur(screen.getByRole("textbox"));
    expect(screen.getByRole("alert")).toHaveTextContent(/64 hexadecimal/);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows the valid text for a valid value", () => {
    render(
      <ValidatedInput
        value={H}
        onChange={() => {}}
        validator={validateHash}
        label="Hash"
        validText="Valid hash"
      />,
    );
    expect(screen.getByText("Valid hash")).toBeInTheDocument();
  });

  it("calls onChange with the typed value", () => {
    const onChange = vi.fn();
    render(<ValidatedInput value="" onChange={onChange} label="L" />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "hello" },
    });
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("does not show an error before the field is touched", () => {
    render(
      <ValidatedInput
        value="xyz"
        onChange={() => {}}
        validator={validateHash}
        label="Hash"
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("drives a parent's submit-disabled state through validity", () => {
    function Harness() {
      const [value, setValue] = useState("");
      return (
        <>
          <ValidatedInput
            value={value}
            onChange={setValue}
            validator={validateHash}
            label="Hash"
          />
          <button type="submit" disabled={!validateHash(value).valid}>
            Submit
          </button>
        </>
      );
    }
    render(<Harness />);
    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: H } });
    expect(submit).toBeEnabled();
  });
});
