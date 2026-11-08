import { describe, expect, it } from "vitest";

import { isSafeExerciseFilePath } from "./file-path";

describe("isSafeExerciseFilePath", () => {
  it.each(["main.c", "string_length.c", "utils.h", "vec.cpp", "vec.hpp", "main.py", "index.js"])(
    "accepts the flat source file %s",
    (name) => {
      expect(isSafeExerciseFilePath(name)).toBe(true);
    },
  );

  it.each(["../main.c", "dir/main.c", "dir\\main.c", "..main.c", "main.txt", "Main.c", ".c", ""])(
    "rejects the unsafe path %s",
    (name) => {
      expect(isSafeExerciseFilePath(name)).toBe(false);
    },
  );

  it.each(["main.C", "main.H", "main.CPP", "main.PY", "main.JS"])(
    "rejects the uppercase extension %s",
    (name) => {
      expect(isSafeExerciseFilePath(name)).toBe(false);
    },
  );
});
