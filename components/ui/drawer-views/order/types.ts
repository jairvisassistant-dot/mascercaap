import type { OrderItem } from "@/lib/schemas/order"

export type Step = 1 | 2 | 3 | 4 | 5 | "cart" | 6 | "result"
export type SubmitStatus = "idle" | "sending" | "success" | "error"

export type State = {
  step: Step;
  items: OrderItem[];
  curProductType: string | null;
  curLineKey: string | null;
  curPresentation: string | null;
  showCustomQty: boolean;
  customQty: string;
  nombre: string;
  email: string;
  waNumber: string;
  consent: boolean;
  status: SubmitStatus;
  waUrl: string | null;
};

export type Action =
  | { type: "selectProductType"; value: string }
  | { type: "editStep1" }
  | { type: "selectLineKey"; value: string; nextStep: Step }
  | { type: "editStep2" }
  | { type: "selectPresentation"; value: string }
  | { type: "editStep3" }
  | { type: "showCustomQty" }
  | { type: "setCustomQty"; value: string }
  | { type: "commitItem"; item: OrderItem }
  | { type: "cancelToCart" }
  | { type: "goToStep"; step: Step }
  | { type: "removeItem"; index: number }
  | { type: "setContact"; field: "nombre" | "email" | "waNumber"; value: string }
  | { type: "setConsent"; value: boolean }
  | { type: "submitStart" }
  | { type: "submitSuccess"; waUrl: string | null }
  | { type: "submitError" }
  | { type: "reset" };
