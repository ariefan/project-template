import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "../components/button";

afterEach(() => {
  cleanup();
});

describe("@workspace/ui", () => {
  describe("Button component", () => {
    it("should render with default variant", () => {
      render(<Button>Click me</Button>);

      const button = screen.getByRole("button", { name: "Click me" });
      expect(button).toBeDefined();
      expect(button.getAttribute("data-variant")).toBe("default");
    });

    it("should render with destructive variant", () => {
      render(<Button variant="destructive">Delete</Button>);

      const button = screen.getByRole("button", { name: "Delete" });
      expect(button.getAttribute("data-variant")).toBe("destructive");
    });

    it("should render with outline variant", () => {
      render(<Button variant="outline">Outline</Button>);

      const button = screen.getByRole("button", { name: "Outline" });
      expect(button.getAttribute("data-variant")).toBe("outline");
    });

    it("should render with ghost variant", () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole("button", { name: "Ghost" });
      expect(button.getAttribute("data-variant")).toBe("ghost");
    });

    it("should render with secondary variant", () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole("button", { name: "Secondary" });
      expect(button.getAttribute("data-variant")).toBe("secondary");
    });

    it("should render with link variant", () => {
      render(<Button variant="link">Link</Button>);

      const button = screen.getByRole("button", { name: "Link" });
      expect(button.getAttribute("data-variant")).toBe("link");
    });

    it("should render with different sizes", () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(
        screen.getByRole("button", { name: "Small" }).getAttribute("data-size")
      ).toBe("sm");

      rerender(<Button size="lg">Large</Button>);
      expect(
        screen.getByRole("button", { name: "Large" }).getAttribute("data-size")
      ).toBe("lg");

      rerender(<Button size="icon">Icon</Button>);
      expect(
        screen.getByRole("button", { name: "Icon" }).getAttribute("data-size")
      ).toBe("icon");
    });

    it("should handle click events", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole("button", { name: "Click me" });
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should be disabled when disabled prop is true", () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );

      const button = screen.getByRole("button", { name: "Disabled" });
      expect(button).toHaveProperty("disabled", true);

      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("should render as child element when asChild is true", () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );

      const link = screen.getByRole("link", { name: "Link Button" });
      expect(link).toBeDefined();
      expect(link.getAttribute("href")).toBe("/test");
    });

    it("should apply custom className", () => {
      render(<Button className="custom-class">Custom</Button>);

      const button = screen.getByRole("button", { name: "Custom" });
      expect(button.classList.contains("custom-class")).toBe(true);
    });

    it("should support type attribute", () => {
      render(<Button type="submit">Submit</Button>);

      const button = screen.getByRole("button", { name: "Submit" });
      expect(button.getAttribute("type")).toBe("submit");
    });
  });
});
