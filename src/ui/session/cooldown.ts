const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

export function cooldownMessage(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / MS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;

  const wait =
    minutes >= 1
      ? `${String(minutes)} minutes and ${String(seconds)} seconds`
      : `${String(totalSeconds)} seconds`;

  return `ERROR: You must wait at least ${wait} until next grading request, so take your time to make more tests and be sure you will succeed next try!`;
}
