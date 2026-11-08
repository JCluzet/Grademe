import { describe, expect, it } from "vitest";

import { CliError, EXIT } from "../errors";
import { friendlyError } from "./friendly-error";

describe("friendlyError", () => {
  it("rewrites an AUTH CliError into the login sentence", () => {
    const result = friendlyError(new CliError("Unauthorized.", EXIT.AUTH));
    expect(result).toBe("Your session expired. Run `grademe login`, then start again.");
  });

  it("surfaces a NETWORK CliError's own (generic, user-facing) message", () => {
    const result = friendlyError(
      new CliError("Couldn't reach Grademe. Please check your connection and try again.", EXIT.NETWORK),
    );
    expect(result).toBe("Couldn't reach Grademe. Please check your connection and try again.");
  });

  it("keeps a BUSINESS CliError's own message", () => {
    const result = friendlyError(new CliError("Cooldown is active.", EXIT.BUSINESS));
    expect(result).toBe("Cooldown is active.");
  });

  it("returns a plain Error's message", () => {
    const result = friendlyError(new Error("disk is full"));
    expect(result).toBe("disk is full");
  });

  it("returns a string value unchanged", () => {
    const result = friendlyError("something went sideways");
    expect(result).toBe("something went sideways");
  });
});
