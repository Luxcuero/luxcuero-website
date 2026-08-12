/* The three band colours a section can sit on. Kept in one place so the mapping from the
   Studio's `background` value to a CSS colour is not repeated in every section. */
const BANDS: Record<string, string> = {
  ink: "background-color: var(--color-ink);",
  cream: "background-color: var(--color-cream);",
  white: "",
};

export function bandStyle(background?: string | null): string | undefined {
  return BANDS[background ?? "white"] || undefined;
}

/** Whether a band needs light-on-dark text. */
export function isDark(background?: string | null): boolean {
  return background === "ink";
}
