export type FormFields = {
  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  tipo: string;
  motivoOtro: string;
  mensaje: string;
};

export type FieldErrors = Partial<Record<keyof FormFields, string>>;

export type AvailabilityCopy = {
  title: string;
  description: string;
  categoryLabel: string;
  categoryHint: string;
  categoryPlaceholder: string;
  categoryRequired: string;
  linesLabel: string;
  productsLabel: string;
  linesHint: string;
  emptyLinesHint: string;
  productsHint: string;
  emptyProductsHint: string;
  linePlaceholder: string;
  productPlaceholder: string;
  templateTitle: string;
  templateCategoryLabel: string;
  templateLineLabel: string;
  templateProductLabel: string;
  additionalInfoLabel: string;
  lineRequired: string;
  productRequired: string;
};
