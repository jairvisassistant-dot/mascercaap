"use client";

import { useReducer, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { MFASection } from "./MFASection";
import type { Factor, MfaStatus, EnrollStep } from "./types";

type State = {
  mfaStatus: MfaStatus;
  enrollStep: EnrollStep;
  qrCode: string;
  code: string[];
  error: string;
  loading: boolean;
};

type Action =
  | { type: "mfaEnabled"; factors: Factor[] }
  | { type: "mfaDisabled" }
  | { type: "mfaStatusError"; message: string }
  | { type: "startLoading" }
  | { type: "loadingDone" }
  | { type: "setError"; error: string }
  | { type: "enrollQrReady"; qrCode: string }
  | { type: "enrollCancel" }
  | { type: "enrollSuccess" }
  | { type: "setCodeDigit"; index: number; value: string };

const EMPTY_CODE = ["", "", "", "", "", ""];

const initialState: State = {
  mfaStatus: { status: "loading" },
  enrollStep: "idle",
  qrCode: "",
  code: EMPTY_CODE,
  error: "",
  loading: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "mfaEnabled":
      return { ...state, mfaStatus: { status: "enabled", factors: action.factors } };
    case "mfaDisabled":
      return { ...state, mfaStatus: { status: "disabled" } };
    case "mfaStatusError":
      return { ...state, mfaStatus: { status: "error", message: action.message } };
    case "startLoading":
      return { ...state, loading: true, error: "" };
    case "loadingDone":
      return { ...state, loading: false };
    case "setError":
      return { ...state, error: action.error };
    case "enrollQrReady":
      return { ...state, enrollStep: "qr", qrCode: action.qrCode };
    case "enrollCancel":
      return { ...state, enrollStep: "idle", qrCode: "", code: EMPTY_CODE, error: "" };
    case "enrollSuccess":
      return { ...state, enrollStep: "idle", qrCode: "", code: EMPTY_CODE };
    case "setCodeDigit": {
      const code = [...state.code];
      code[action.index] = action.value;
      return { ...state, code };
    }
    default:
      return state;
  }
}

export default function SeguridadPage() {
  const { push } = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { mfaStatus, enrollStep, qrCode, code, error, loading } = state;
  const factorIdRef = useRef("");

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth/mfa/status");
      if (res.status === 401) { push("/admin/login"); return; }
      const data = await res.json();
      if (!res.ok) {
        dispatch({ type: "mfaStatusError", message: data.error ?? "Error al cargar" });
        return;
      }
      if (data.mfa_enabled) {
        dispatch({ type: "mfaEnabled", factors: data.factors });
      } else {
        dispatch({ type: "mfaDisabled" });
      }
    } catch {
      dispatch({ type: "mfaStatusError", message: "Error de conexión" });
    }
  }, [push]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  async function handleStartEnroll() {
    dispatch({ type: "startLoading" });
    try {
      const res = await fetch("/api/admin/auth/mfa/enroll", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { dispatch({ type: "setError", error: data.error ?? "Error al generar QR" }); return; }
      factorIdRef.current = data.factor_id ?? "";
      dispatch({ type: "enrollQrReady", qrCode: data.qr_code });
    } catch {
      dispatch({ type: "setError", error: "Error de conexión" });
    } finally {
      dispatch({ type: "loadingDone" });
    }
  }

  async function handleVerifyEnroll() {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      dispatch({ type: "setError", error: "Ingresá el código completo de 6 dígitos" });
      return;
    }
    dispatch({ type: "startLoading" });
    try {
      const res = await fetch("/api/admin/auth/mfa/verify-enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factor_id: factorIdRef.current, code: fullCode }),
      });
      const data = await res.json();
      if (!res.ok) { dispatch({ type: "setError", error: data.error ?? "Código incorrecto" }); return; }
      dispatch({ type: "enrollSuccess" });
      factorIdRef.current = "";
      await loadStatus();
    } catch {
      dispatch({ type: "setError", error: "Error de conexión" });
    } finally {
      dispatch({ type: "loadingDone" });
    }
  }

  async function handleDisable(factorIdToRemove: string) {
    if (!confirm("¿Estás seguro de deshabilitar la verificación en dos pasos?")) return;
    dispatch({ type: "startLoading" });
    try {
      const res = await fetch("/api/admin/auth/mfa/unenroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factor_id: factorIdToRemove }),
      });
      const data = await res.json();
      if (!res.ok) { dispatch({ type: "setError", error: data.error ?? "Error al deshabilitar" }); return; }
      await loadStatus();
    } catch {
      dispatch({ type: "setError", error: "Error de conexión" });
    } finally {
      dispatch({ type: "loadingDone" });
    }
  }

  function handleCodeChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    dispatch({ type: "setCodeDigit", index, value });
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text-main">Seguridad</h1>
        <p className="mt-1 text-sm text-text-muted">
          Configuración de la verificación en dos pasos (2FA) para el acceso al panel de administración.
        </p>
      </div>

      <MFASection
        mfaStatus={mfaStatus}
        enrollStep={enrollStep}
        qrCode={qrCode}
        code={code}
        error={error}
        loading={loading}
        onStartEnroll={handleStartEnroll}
        onVerifyEnroll={handleVerifyEnroll}
        onDisable={handleDisable}
        onCodeChange={handleCodeChange}
        onCancelEnroll={() => { factorIdRef.current = ""; dispatch({ type: "enrollCancel" }); }}
        onBack={() => push("/admin/productos")}
      />
    </div>
  );
}
