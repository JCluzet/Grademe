export const MAX_SUBMITTED_FILE_CONTENT_LENGTH = 20_000;

export const MAX_SUBMITTED_FILE_COUNT = 20;

export function isWithinSubmittedFileContentLimit(value: string): boolean {
  return value.length <= MAX_SUBMITTED_FILE_CONTENT_LENGTH;
}
