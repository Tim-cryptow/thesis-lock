import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StarButton from "@/app/components/StarButton";
import { addFavorite, isFavorite } from "@/lib/favorites";

const H = "a".repeat(64);

beforeEach(() => {
  window.localStorage.clear();
});

describe("StarButton", () => {
  it("renders an unpressed star initially", () => {
    render(<StarButton type="hash" value={H} label="My doc" />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveAccessibleName("Add to favorites");
  });

  it("fills and marks pressed on click", () => {
    render(<StarButton type="hash" value={H} label="My doc" />);
    fireEvent.click(screen.getByRole("button"));
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAccessibleName("Remove from favorites");
  });

  it("persists the favorite to storage on click", () => {
    render(<StarButton type="hash" value={H} label="My doc" />);
    fireEvent.click(screen.getByRole("button"));
    expect(isFavorite("hash", H)).toBe(true);
  });

  it("toggles back off on a second click", () => {
    render(<StarButton type="hash" value={H} label="My doc" />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    expect(isFavorite("hash", H)).toBe(false);
  });

  it("reflects an already-favorited value on mount", () => {
    addFavorite("hash", H, "My doc");
    render(<StarButton type="hash" value={H} label="My doc" />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("applies a custom className", () => {
    render(<StarButton type="hash" value={H} label="My doc" className="ml-2" />);
    expect(screen.getByRole("button").getAttribute("class")).toContain("ml-2");
  });
});
