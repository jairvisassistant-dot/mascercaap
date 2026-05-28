export const LINES_FALLBACK: LineOption[] = [
  { key: "limon", label: "Zumo de Limón", categoryKey: null },
  { key: "limonada-cereza", label: "Limonada con Cereza", categoryKey: null },
  { key: "limonada-coco", label: "Limonada con Coco", categoryKey: null },
  { key: "maracuya", label: "Zumo de Maracuyá", categoryKey: null },
  { key: "pulpa-maracuya", label: "Pulpa de Maracuyá", categoryKey: null },
  { key: "pulpa-mora", label: "Pulpa de Mora", categoryKey: null },
  { key: "pulpa-fresa", label: "Pulpa de Fresa", categoryKey: null },
  { key: "pulpa-mango", label: "Pulpa de Mango", categoryKey: null },
  { key: "pulpa-guanabana", label: "Pulpa de Guanábana", categoryKey: null },
  { key: "pulpa-lulo", label: "Pulpa de Lulo", categoryKey: null },
  { key: "pulpa-guayaba", label: "Pulpa de Guayaba", categoryKey: null },
  { key: "pulpa-frutos-rojos", label: "Pulpa de Frutos Rojos", categoryKey: null },
  { key: "pulpa-frutos-amarillos", label: "Pulpa de Frutos Amarillos", categoryKey: null },
  { key: "pulpa-tomate-arbol", label: "Pulpa de Tomate de Árbol", categoryKey: null },
  { key: "kumiss", label: "Kumiss / Yogurt", categoryKey: null },
];

export type FormData = {
  name: string;
  line: string;
  presentation: string;
  presentationOrder: number;
  price: string;
  image: string;
  description: string;
  ingredients: string[];
  benefits: string[];
  isSoldOut: boolean;
  isBestSeller: boolean;
  featured: boolean;
  active: boolean;
  displayOrder: number;
};

export type LineOption = { key: string; label: string; categoryKey?: string | null };
export type Category = { key: string; label: string };

export const defaultForm: FormData = {
  name: "",
  line: "",
  presentation: "",
  presentationOrder: 1,
  price: "",
  image: "",
  description: "",
  ingredients: [],
  benefits: [],
  isSoldOut: false,
  isBestSeller: false,
  featured: false,
  active: true,
  displayOrder: 0,
};

export type State = {
  form: FormData;
  lines: LineOption[];
  categories: Category[];
  selectedCategory: string;
  existingIds: Set<string>;
  loadingCatalog: boolean;
  newIngredient: string;
  newBenefit: string;
  uploading: boolean;
  saving: boolean;
  error: string;
};

export type Action =
  | { type: "setFormField"; key: keyof FormData; value: FormData[keyof FormData] }
  | { type: "catalogLoaded"; lines: LineOption[]; categories: Category[]; existingIds: Set<string>; selectedCategory: string; lineKey: string }
  | { type: "catalogError"; message: string }
  | { type: "setCategory"; catKey: string; lineKey?: string }
  | { type: "setNewIngredient"; value: string }
  | { type: "addIngredient" }
  | { type: "setNewBenefit"; value: string }
  | { type: "addBenefit" }
  | { type: "uploadStart" }
  | { type: "uploadSuccess"; url: string }
  | { type: "uploadError"; message: string }
  | { type: "saveStart" }
  | { type: "saveError"; message: string }
  | { type: "clearError" };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "setFormField":
      return { ...state, form: { ...state.form, [action.key]: action.value } };
    case "catalogLoaded":
      return {
        ...state,
        lines: action.lines,
        categories: action.categories,
        existingIds: action.existingIds,
        loadingCatalog: false,
        selectedCategory: action.selectedCategory || state.selectedCategory,
        form: action.lineKey ? { ...state.form, line: action.lineKey } : state.form,
      };
    case "catalogError":
      return { ...state, loadingCatalog: false, error: action.message };
    case "setCategory":
      return {
        ...state,
        selectedCategory: action.catKey,
        form:
          action.lineKey !== undefined
            ? { ...state.form, line: action.lineKey }
            : state.form,
      };
    case "setNewIngredient":
      return { ...state, newIngredient: action.value };
    case "addIngredient":
      if (!state.newIngredient.trim()) return state;
      return {
        ...state,
        form: { ...state.form, ingredients: [...state.form.ingredients, state.newIngredient.trim()] },
        newIngredient: "",
      };
    case "setNewBenefit":
      return { ...state, newBenefit: action.value };
    case "addBenefit":
      if (!state.newBenefit.trim()) return state;
      return {
        ...state,
        form: { ...state.form, benefits: [...state.form.benefits, state.newBenefit.trim()] },
        newBenefit: "",
      };
    case "uploadStart":
      return { ...state, uploading: true, error: "" };
    case "uploadSuccess":
      return { ...state, uploading: false, form: { ...state.form, image: action.url } };
    case "uploadError":
      return { ...state, uploading: false, error: action.message };
    case "saveStart":
      return { ...state, saving: true, error: "" };
    case "saveError":
      return { ...state, saving: false, error: action.message };
    case "clearError":
      return { ...state, error: "" };
    default:
      return state;
  }
}
