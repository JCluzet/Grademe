import pkg from "../package.json" with { type: "json" };

declare const __GRADEME_VERSION__: string;
declare const __GRADEME_API_URL__: string;
export const CLI_VERSION = typeof __GRADEME_VERSION__ === "string" ? __GRADEME_VERSION__ : pkg.version;
export const DEFAULT_API_URL = typeof __GRADEME_API_URL__ === "string" ? __GRADEME_API_URL__ : "https://grademe.io";
