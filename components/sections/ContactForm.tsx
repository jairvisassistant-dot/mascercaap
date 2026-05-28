"use client";

import { useReducer, useEffect, useMemo } from "react";
import { createContactSchema } from "@/lib/schemas/contact";
import { SITE_CONFIG } from "@/lib/config";
import { buildWhatsAppAppUrl, buildWhatsAppMessage } from "@/lib/whatsapp";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { Product, ProductCategory, ProductLineConfig } from "@/types";
import type { FormFields, FieldErrors, AvailabilityCopy } from "./contact/types";
import ContactAvailabilitySelector from "./contact/ContactAvailabilitySelector";
import ContactFields from "./contact/ContactFields";
import ContactSubmitFeedback from "./contact/ContactSubmitFeedback";

const EMPTY: FormFields = { nombre: "", empresa: "", email: "", telefono: "", tipo: "", motivoOtro: "", mensaje: "" };

const EMPTY_LINES: ProductLineConfig[] = [];
const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_CATEGORIES: ProductCategory[] = [];

type State = {
  fields: FormFields;
  fieldErrors: FieldErrors;
  consented: boolean;
  consentError: boolean;
  isSubmitting: boolean;
  submitStatus: "success" | "error" | null;
  whatsappUrl: string | null;
  selectedCategoryKey: string;
  selectedLineKey: string;
  selectedProductId: string;
  availabilityError: string | null;
};

const INITIAL_STATE: State = {
  fields: EMPTY,
  fieldErrors: {},
  consented: false,
  consentError: false,
  isSubmitting: false,
  submitStatus: null,
  whatsappUrl: null,
  selectedCategoryKey: "",
  selectedLineKey: "",
  selectedProductId: "",
  availabilityError: null,
};

type Action =
  | { type: "setField"; key: keyof FormFields; value: string }
  | { type: "setFieldErrors"; errors: FieldErrors }
  | { type: "setConsented"; value: boolean }
  | { type: "setConsentError"; value: boolean }
  | { type: "changeType"; value: string; additionalInfoLabel: string }
  | { type: "selectCategory"; key: string; mensaje: string }
  | { type: "selectLine"; key: string; mensaje: string }
  | { type: "selectProduct"; id: string; mensaje: string; clearMensajeError: boolean }
  | { type: "setAvailabilityError"; message: string }
  | { type: "submitStart" }
  | { type: "submitSuccess"; whatsappUrl: string | null }
  | { type: "submitError" }
  | { type: "submitReset" };

function stripAvailabilityTemplate(message: string, additionalInfoLabel: string) {
  const marker = `${additionalInfoLabel}:`;
  const markerIndex = message.indexOf(marker);
  if (markerIndex === -1) return message;
  return message.slice(markerIndex + marker.length).trimStart();
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "setField":
      return {
        ...state,
        fields: { ...state.fields, [action.key]: action.value },
        fieldErrors: { ...state.fieldErrors, [action.key]: undefined },
      };
    case "setFieldErrors":
      return { ...state, fieldErrors: action.errors };
    case "setConsented":
      return {
        ...state,
        consented: action.value,
        consentError: action.value ? false : state.consentError,
      };
    case "setConsentError":
      return { ...state, consentError: action.value };
    case "changeType": {
      let mensaje = state.fields.mensaje;
      let motivoOtro = state.fields.motivoOtro;
      const newErrors: FieldErrors = { ...state.fieldErrors, tipo: undefined };
      let selectedCategoryKey = state.selectedCategoryKey;
      let selectedLineKey = state.selectedLineKey;
      let selectedProductId = state.selectedProductId;
      let availabilityError = state.availabilityError;

      if (action.value !== "disponibilidad") {
        selectedCategoryKey = "";
        selectedLineKey = "";
        selectedProductId = "";
        availabilityError = null;
        const stripped = stripAvailabilityTemplate(mensaje, action.additionalInfoLabel);
        if (stripped !== mensaje) mensaje = stripped;
      }
      if (action.value !== "otro") {
        motivoOtro = "";
        delete newErrors.motivoOtro;
      }

      return {
        ...state,
        fields: { ...state.fields, tipo: action.value, mensaje, motivoOtro },
        fieldErrors: newErrors,
        selectedCategoryKey,
        selectedLineKey,
        selectedProductId,
        availabilityError,
      };
    }
    case "selectCategory":
      return {
        ...state,
        selectedCategoryKey: action.key,
        selectedLineKey: "",
        selectedProductId: "",
        availabilityError: null,
        fields: { ...state.fields, mensaje: action.mensaje },
      };
    case "selectLine":
      return {
        ...state,
        selectedLineKey: action.key,
        selectedProductId: "",
        availabilityError: null,
        fields: { ...state.fields, mensaje: action.mensaje },
      };
    case "selectProduct":
      return {
        ...state,
        selectedProductId: action.id,
        availabilityError: null,
        fields: { ...state.fields, mensaje: action.mensaje },
        fieldErrors: action.clearMensajeError
          ? { ...state.fieldErrors, mensaje: undefined }
          : state.fieldErrors,
      };
    case "setAvailabilityError":
      return { ...state, availabilityError: action.message };
    case "submitStart":
      return { ...state, isSubmitting: true, consentError: false };
    case "submitSuccess":
      return {
        ...state,
        isSubmitting: false,
        submitStatus: "success",
        whatsappUrl: action.whatsappUrl,
        fields: EMPTY,
        fieldErrors: {},
        consented: false,
        selectedLineKey: "",
        selectedProductId: "",
        availabilityError: null,
      };
    case "submitError":
      return { ...state, isSubmitting: false, submitStatus: "error" };
    case "submitReset":
      return { ...state, submitStatus: null };
    default:
      return state;
  }
}

interface ContactFormProps {
  dict: Dictionary;
  lang: Locale;
  lines?: ProductLineConfig[];
  products?: Product[];
  categories?: ProductCategory[];
}

export default function ContactForm({ dict, lang, lines = EMPTY_LINES, products = EMPTY_PRODUCTS, categories = EMPTY_CATEGORIES }: ContactFormProps) {
  const t = dict.contact.form;
  const availability = t.availabilityAssistant as AvailabilityCopy;

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const {
    fields, fieldErrors, consented, consentError,
    isSubmitting, submitStatus, whatsappUrl,
    selectedCategoryKey, selectedLineKey, selectedProductId, availabilityError,
  } = state;

  const linesByKey = useMemo(
    () => new Map(lines.map((line) => [line.key, line])),
    [lines]
  );

  const visibleLines = useMemo(
    () => lines.filter((line) => line.categoryKey === selectedCategoryKey),
    [lines, selectedCategoryKey]
  );

  const visibleProducts = useMemo(
    () => products.filter((product) => product.line === selectedLineKey),
    [products, selectedLineKey]
  );

  useEffect(() => {
    if (!submitStatus) return;
    const timer = setTimeout(() => dispatch({ type: "submitReset" }), 8000);
    return () => clearTimeout(timer);
  }, [submitStatus]);

  function update(key: keyof FormFields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      dispatch({ type: "setField", key, value: e.target.value });
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (fields.tipo === "disponibilidad") {
      if (!selectedCategoryKey) {
        dispatch({ type: "setAvailabilityError", message: availability.categoryRequired });
        return;
      }
      if (!selectedLineKey) {
        dispatch({ type: "setAvailabilityError", message: availability.lineRequired });
        return;
      }
      if (!selectedProductId) {
        dispatch({ type: "setAvailabilityError", message: availability.productRequired });
        return;
      }
    }

    if (!consented) {
      dispatch({ type: "setConsentError", value: true });
      return;
    }

    const schema = createContactSchema(dict.contact.validation);
    const result = schema.safeParse(fields);

    if (!result.success) {
      const errs: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormFields;
        if (key && !errs[key]) errs[key] = issue.message;
      }
      dispatch({ type: "setFieldErrors", errors: errs });
      return;
    }

    const data = result.data;
    dispatch({ type: "submitStart" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, lang }),
      });

      if (response.ok) {
        const wm = t.whatsappMsg;
        const tipoLabels = wm.tipoLabel as Record<string, string>;
        const reason = data.tipo === "otro" && data.motivoOtro
          ? data.motivoOtro
          : (tipoLabels[data.tipo] ?? data.tipo);
        const msg = buildWhatsAppMessage([
          wm.greeting,
          "",
          wm.intro.replace("{name}", data.nombre).replace("{reason}", reason),
          data.empresa ? wm.company.replace("{company}", data.empresa) : null,
          wm.email.replace("{email}", data.email),
          wm.phone.replace("{phone}", data.telefono),
          "",
          wm.message,
          data.mensaje,
        ]);

        const waNumber = SITE_CONFIG.whatsappNumber;
        dispatch({
          type: "submitSuccess",
          whatsappUrl: waNumber ? buildWhatsAppAppUrl(waNumber, msg) : null,
        });
      } else {
        dispatch({ type: "submitError" });
      }
    } catch {
      console.error("Error enviando formulario de contacto");
      dispatch({ type: "submitError" });
    }
  }

  return (
    <div className="bg-surface-card rounded-2xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-text-main mb-6">
        {t.title}
      </h2>
      <p className="-mt-3 mb-6 text-sm leading-relaxed text-text-muted">
        {t.helper}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Tipo */}
        <div>
          <label htmlFor="tipo" className="block text-sm font-medium text-text-sub mb-1">
            {t.labels.type}
          </label>
          <select
            id="tipo"
            value={fields.tipo}
            onChange={(e) => dispatch({ type: "changeType", value: e.target.value, additionalInfoLabel: availability.additionalInfoLabel })}
            className={`w-full px-4 py-3 rounded-lg border ${
              fieldErrors.tipo ? "border-red-500" : "border-border-mid"
            } focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-surface-card text-text-main`}
          >
            <option value="">{t.options.default}</option>
            <option value="pedido">{t.options.order}</option>
            <option value="consulta-pedido">{t.options.queryOrder}</option>
            <option value="disponibilidad">{t.options.availability}</option>
            <option value="peticion-queja-reclamo">{t.options.petitionComplaintClaim}</option>
            <option value="contacto">{t.options.contact}</option>
            <option value="otro">{t.options.other}</option>
          </select>
          {fieldErrors.tipo && (
            <p className="text-red-500 text-sm mt-1">{fieldErrors.tipo}</p>
          )}
        </div>

        {fields.tipo === "disponibilidad" && (
          <ContactAvailabilitySelector
            availability={availability}
            selectedCategoryKey={selectedCategoryKey}
            selectedLineKey={selectedLineKey}
            selectedProductId={selectedProductId}
            availabilityError={availabilityError}
            mensaje={fields.mensaje}
            categories={categories}
            visibleLines={visibleLines}
            visibleProducts={visibleProducts}
            linesByKey={linesByKey}
            onSelectCategory={(key, mensaje) => dispatch({ type: "selectCategory", key, mensaje })}
            onSelectLine={(key, mensaje) => dispatch({ type: "selectLine", key, mensaje })}
            onSelectProduct={(id, mensaje, clearMensajeError) => dispatch({ type: "selectProduct", id, mensaje, clearMensajeError })}
          />
        )}

        <ContactFields
          t={t}
          lang={lang}
          fields={fields}
          fieldErrors={fieldErrors}
          consented={consented}
          consentError={consentError}
          availability={availability}
          onFieldChange={update}
          onConsentChange={(value) => dispatch({ type: "setConsented", value })}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t.submitting : t.submit}
        </button>
      </form>

      <ContactSubmitFeedback
        submitStatus={submitStatus}
        whatsappUrl={whatsappUrl}
        t={t}
        onReset={() => dispatch({ type: "submitReset" })}
      />
    </div>
  );
}
