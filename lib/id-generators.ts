function toLetters(name: string, len: number): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[^a-z]/g, "")
    .slice(0, len);
}

export function generateCategoryKey(existingCount: number): string {
  return `cat-${existingCount + 1}`;
}

export function generateLineKey(categoryKey: string, name: string): string {
  if (!categoryKey || !name.trim()) return "";
  const letters = toLetters(name, 3);
  return letters ? `${categoryKey}-${letters}` : "";
}

export function generateProductId(
  lineKey: string,
  name: string,
  existingIds: Set<string>,
): { id: string; adjusted: boolean } {
  if (!lineKey || !name.trim()) return { id: "", adjusted: false };

  const base = toLetters(name, 10);
  if (!base) return { id: "", adjusted: false };

  // Try 3 letters (ideal)
  const three = base.slice(0, 3);
  const candidate3 = `${lineKey}-${three}`;
  if (!existingIds.has(candidate3)) return { id: candidate3, adjusted: false };

  // Try 4 and 5 letters before resorting to suffix
  for (let len = 4; len <= Math.min(5, base.length); len++) {
    const candidate = `${lineKey}-${base.slice(0, len)}`;
    if (!existingIds.has(candidate)) return { id: candidate, adjusted: true };
  }

  // Numeric suffix
  for (let n = 2; n <= 99; n++) {
    const candidate = `${lineKey}-${three}-${n}`;
    if (!existingIds.has(candidate)) return { id: candidate, adjusted: true };
  }

  return { id: `${lineKey}-${three}-${Date.now()}`, adjusted: true };
}
