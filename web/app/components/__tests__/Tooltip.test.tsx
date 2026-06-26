import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Tooltip from "@/app/components/Tooltip";

describe("Tooltip", () => {
  it("is hidden by default", () => {
    render(<Tooltip content="Help text" />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows the content on hover", () => {
    const { container } = render(<Tooltip content="Help text" />);
    fireEvent.mouseEnter(container.firstChild as HTMLElement);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Help text");
  });

  it("hides again on mouse leave", () => {
    const { container } = render(<Tooltip content="Help text" />);
    const root = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(root);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.mouseLeave(root);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("applies the panel classes for the requested position", () => {
    const { container } = render(
      <Tooltip content="Help text" position="bottom" />,
    );
    fireEvent.mouseEnter(container.firstChild as HTMLElement);
    expect(screen.getByRole("tooltip").getAttribute("class")).toContain(
      "top-full",
    );
  });

  it("uses the label as the trigger's accessible name", () => {
    render(<Tooltip content="Help text" label="What is a hash?" />);
    expect(
      screen.getByRole("button", { name: "What is a hash?" }),
    ).toBeInTheDocument();
  });

  it("toggles open and closed for the click trigger", () => {
    render(<Tooltip content="Help text" trigger="click" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
