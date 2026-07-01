export function splitRows(text: string): string[] {
  return text
    .split("\n")
    .map((row) => row.trim())
    .filter((row) => row.length > 0);
}

export function tokenize(text: string): string[] {
  return text.split(/\s+/);
}
