export const ALT_SCREEN_ENTER = "[?1049h";
export const ALT_SCREEN_LEAVE = "[?1049l";

export interface AltScreen {
  leave: () => void;
}

export function enterAltScreen(stdout: NodeJS.WriteStream): AltScreen {
  if (!stdout.isTTY) {
    return { leave: () => undefined };
  }

  let left = false;
  const leave = (): void => {
    if (left) return;
    left = true;
    stdout.write(ALT_SCREEN_LEAVE);
    process.off("exit", leave);
  };

  process.on("exit", leave);
  stdout.write(ALT_SCREEN_ENTER);

  return { leave };
}
