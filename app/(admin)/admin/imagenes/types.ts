export type ProductRow = {
  id: string;
  name: string;
  line: string;
  presentation: string;
  image: string | null;
  display_order: number;
};

export type FileEntry = {
  id: string;
  file: File;
  previewUrl: string;
  /** Resultado del matching automático */
  match:
    | { type: "replace"; product: ProductRow }
    | { type: "new"; product: ProductRow }
    | { type: "ambiguous"; candidates: ProductRow[]; reason: string }
    | { type: "none"; reason: string }
    | { type: "skipped"; reason: string };
  /** Producto asignado manualmente (para ambiguous/none) */
  manualProductId: string | null;
  uploadStatus: "pending" | "uploading" | "done" | "error";
  errorMessage?: string;
  uploadedUrl?: string;
};
