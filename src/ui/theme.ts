const background = Number(process.env["COLORFGBG"]?.split(";").at(-1) ?? 0);
const light = background >= 7 && background <= 15 && background !== 8;

export const THEME = {
  accent: light ? "#047857" : "#34D399",
  success: light ? "#047857" : "#34D399",
  completed: light ? "#7C6115" : "#D9B45B",
  error: light ? "#B91C1C" : "#F87171",
  warn: light ? "#B45309" : "#FBBF24",
  dim: light ? "#78716C" : "#A1A1AA",
  realMode: light ? "#78716C" : "#A1A1AA",
} as const;
