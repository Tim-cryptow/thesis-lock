import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmDialog from "@/app/components/ConfirmDialog";

function setup(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const props = {
    open: true,
    title: "Delete item",
    message: "This cannot be undone.",
    confirmLabel: "Delete",
    onConfirm,
    onCancel,
    ...overrides,
  };
  render(<ConfirmDialog {...props} />);
  return { onConfirm, onCancel };
}

describe("ConfirmDialog", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="t"
        message="m"
        confirmLabel="OK"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the title and message when open", () => {
    setup();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delete item" })).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is clicked", () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the cancel button is clicked", () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel on Escape", () => {
    const { onCancel } = setup();
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("uses a red confirm button for the danger variant", () => {
    setup({ variant: "danger" });
    expect(screen.getByRole("button", { name: "Delete" }).getAttribute("class")).toContain(
      "bg-red-600",
    );
  });

  it("uses a custom cancel label", () => {
    setup({ cancelLabel: "Keep" });
    expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
  });

  it("keeps confirm disabled until the required word is typed", () => {
    setup({ requireType: "DELETE" });
    const confirm = screen.getByRole("button", { name: "Delete" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "DELETE" },
    });
    expect(confirm).toBeEnabled();
  });

  it("confirms after the required word is typed", () => {
    const { onConfirm } = setup({ requireType: "DELETE" });
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "DELETE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
