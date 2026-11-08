import { z } from "zod";

export const cliAuthTokenRequestSchema = z.object({
  code: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  code_verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
}).strict();

export const cliAuthTokenResponseSchema = z.object({
  token: z.string().min(1),
  user: z.object({ email: z.email().optional(), id: z.string().min(1) }),
});

export type CliAuthTokenRequest = z.infer<typeof cliAuthTokenRequestSchema>;
export type CliAuthTokenResponse = z.infer<typeof cliAuthTokenResponseSchema>;
