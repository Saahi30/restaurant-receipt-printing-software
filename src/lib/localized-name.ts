/** Prefer Hindi label when app language is Hindi and a Hindi name exists. */
export function localizedName(
  item: { name: string; nameHi?: string | null },
  lang: string
): string {
  if (lang === "hi" && item.nameHi && item.nameHi.trim() !== "") {
    return item.nameHi;
  }
  return item.name;
}
