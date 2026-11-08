import { traceHeadline } from "../headline";
import type { TraceSection } from "../types";

export const verdictSection: TraceSection = (model) => [`RESULT  KO · ${traceHeadline(model)}`, ""];
