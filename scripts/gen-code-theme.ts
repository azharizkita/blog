// Run: node scripts/gen-code-theme.ts (Node type stripping; no "@/" alias).
import { writeFileSync } from "node:fs";
import { createThemeCss } from "@tanstack/highlight/theme";
import { githubLightTheme } from "@tanstack/highlight/themes/github-light";
import { githubDarkTheme } from "@tanstack/highlight/themes/github-dark";

const raw = createThemeCss({
  light: githubLightTheme,
  dark: githubDarkTheme,
  darkSelector: ".dark",
  codeBlockSelector: "pre.tm-code",
});

// Code blocks keep `bg-card`, so drop any background declarations.
const css = raw.replace(/^[ \t]*(?:--th-background|background(?:-color)?)\s*:[^;]*;[ \t]*\r?\n?/gm, "");

writeFileSync(new URL("../app/code-theme.css", import.meta.url), css);
console.log(`wrote app/code-theme.css (${css.length} bytes)`);
