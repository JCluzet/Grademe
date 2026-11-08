export const EXIT = { OK: 0, USER: 1, AUTH: 2, NETWORK: 3, BUSINESS: 4, INTERNAL: 5 } as const;
export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

export class CliError extends Error {
  constructor(message: string, readonly exitCode: ExitCode) {
    super(message);
    this.name = "CliError";
  }
}

const SERVER_CODE_EXIT: Record<string, ExitCode> = {
  AUTH_REQUIRED: EXIT.AUTH, UNAUTHORIZED: EXIT.AUTH, INVALID_CODE: EXIT.AUTH,
  QUEUE_FULL: EXIT.NETWORK, REMOTE_PROVIDER_ERROR: EXIT.NETWORK,
  REMOTE_PROVIDER_NOT_CONFIGURED: EXIT.NETWORK, SCHEDULER_ERROR: EXIT.NETWORK,
  NO_ACTIVE_SESSION: EXIT.BUSINESS, SESSION_EXPIRED: EXIT.BUSINESS,
  COOLDOWN_ACTIVE: EXIT.BUSINESS, INVALID_LEVEL: EXIT.BUSINESS,
};

export function exitForServerCode(code: string): ExitCode {
  return SERVER_CODE_EXIT[code] ?? EXIT.INTERNAL;
}
