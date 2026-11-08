const EXERCISE_FILE_PATH_PATTERN = /^[a-z0-9][a-z0-9._-]*\.(c|h|cpp|hpp|py|js)$/;

export function isSafeExerciseFilePath(value: string): boolean {
  if (value.includes("/") || value.includes("\\")) return false;
  if (value.includes("..")) return false;

  return EXERCISE_FILE_PATH_PATTERN.test(value);
}
