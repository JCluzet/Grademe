import { describe, expect, it, vi } from "vitest";

import { CliError, EXIT } from "../errors";
import { confirmLogin } from "./login-confirmation";

describe("confirmLogin", () => {
  it("waits for an explicit Enter confirmation in an interactive terminal", async () => {
    const ask = vi.fn(() => Promise.resolve());

    await confirmLogin({ ask, isInteractive: true });

    expect(ask).toHaveBeenCalledWith(
      "You need to sign in to use Grademe. Press Enter to continue (Ctrl+C to cancel): ",
    );
  });

  it("does not hang when stdin is not interactive", async () => {
    const ask = vi.fn(() => Promise.resolve());

    const error = await confirmLogin({ ask, isInteractive: false }).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(CliError);
    if (error instanceof CliError) expect(error.exitCode).toBe(EXIT.AUTH);
    expect(ask).not.toHaveBeenCalled();
  });
});
