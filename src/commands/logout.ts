import { GrademeApi } from "../api/client";
import { configDir, resolveApiUrl } from "../config/paths";
import { FileTokenStore } from "../config/token-store";
import { EXIT } from "../errors";

export async function runLogoutCommand(): Promise<number> {
  const store = new FileTokenStore(configDir());
  const creds = await store.load();
  let revocationConfirmed = true;

  if (creds) {
    try {
      const api = new GrademeApi({
        baseUrl: resolveApiUrl(creds.apiUrl),
        fetch: (input, init) => fetch(input, {
          ...init,
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
        }),
        token: creds.token,
      });
      await api.revoke();
    } catch {
      revocationConfirmed = false;
    }
  }

  await store.clear();
  if (revocationConfirmed) process.stdout.write("Logged out\n");
  else process.stderr.write("Signed out on this computer. Server revocation could not be confirmed; the remote token may still be active.\n");
  return EXIT.OK;
}
