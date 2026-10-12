export type LineOption = { key: string; label: string; categoryKey?: string | null };
export type Category = { key: string; label: string };
export type ProductMode = "create" | "edit";

export function filterLinesByCategory(lines: LineOption[], selectedCategory: string): LineOption[] {
  return selectedCategory ? lines.filter((l) => l.categoryKey === selectedCategory) : lines;
}

export function productIdEmptyHint(line: string, name: string): string {
  if (!line) return "Selecciona una línea primero";
  if (!name.trim()) return "Escribe el nombre para generar el ID";
  return "—";
}

export function isSubmitDisabled(
  saving: boolean,
  uploading: boolean,
  mode: ProductMode,
  generatedId: string
): boolean {
  return saving || uploading || (mode === "create" && !generatedId);
}

export function submitLabel(saving: boolean, mode: ProductMode): string {
  if (saving) return "Guardando...";
  return mode === "create" ? "Crear producto" : "Guardar cambios";
}
