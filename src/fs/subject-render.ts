import type { CliExerciseContent } from "@grademe/contracts";

const SEPARATOR = "-".repeat(80);

export function renderSubject(content: CliExerciseContent): string {
  const allowed =
    content.allowedFunctions.length > 0 ? content.allowedFunctions.join(", ") : "None";

  const lines: string[] = [
    `Assignment name: ${content.assignmentName}`,
    `Expected files: ${content.expectedFiles.join(", ")}`,
    `Allowed functions: ${allowed}`,
    SEPARATOR,
    content.instructions,
  ];

  if (content.examples.length > 0) {
    lines.push("", "Examples:");
    for (const example of content.examples) {
      lines.push("", `$ ${example.command}`, example.output);
    }
  }

  return `${lines.join("\n").replace(/\n*$/, "")}\n`;
}
