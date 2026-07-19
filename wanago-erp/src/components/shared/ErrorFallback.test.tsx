import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as Sentry from "@sentry/nextjs";
import { ErrorFallback } from "./ErrorFallback";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

describe("ErrorFallback", () => {
  it("reports the error to Sentry/GlitchTip and shows a reference digest", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    render(<ErrorFallback error={error} reset={vi.fn()} />);

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(screen.getByText("Ref: abc123")).toBeInTheDocument();
  });

  it("calls reset when 'Try again' is clicked", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<ErrorFallback error={new Error("boom")} reset={reset} />);

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
