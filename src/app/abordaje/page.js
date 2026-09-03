"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Scanner from "@/components/Scanner";
import { maskId, formatDateTime } from "@/lib/utils";
import { playScanFeedback } from "@/lib/scanFeedback";
import {
  genScanId,
  getQueue,
  pushToQueue,
  removeFromQueue,
  saveLocalCache,
  getLocalCache,
  lookupLocal,
} from "@/lib/offline";

// Cuánto se queda el resultado en pantalla antes de volver a escanear
// automáticamente (escaneo continuo — pensado para una tablet fija donde
// suben pasajeros uno tras otro). Los casos que sí permiten abordar pasan
// rápido para no frenar la fila; los que lo deniegan se quedan un poco más
// para que el operador los note.
const AUTO_RETURN_MS = { AUTORIZADO: 2500, DEFAULT: 4500 };
function autoReturnDelay(resultado) {
  return AUTO_RETURN_MS[resultado] ?? AUTO_RETURN_MS.DEFAULT;
}

const SCREENS = {
  AUTORIZADO: {
    tone: "bg-brand-600",
    emoji: "🟢",
    title: "¡ADELANTE!",
    footer: "✓ ABORDAJE PERMITIDO",
  },
  NO_AUTORIZADO: {
    tone: "bg-rose-600",
    emoji: "🔴",
    title: "PASAJERO NO AUTORIZADO",
    footer: "✕ ABORDAJE NO PERMITIDO",
  },
  QR_NO_ENCONTRADO: {
    tone: "bg-amber-500",
    emoji: "⚠️",
    title: "QR NO REGISTRADO",
    footer: "Este código no corresponde a ningún pasajero registrado.",
  },
  YA_REGISTRADO: {
    tone: "bg-orange-500",
    emoji: "🟠",
    title: "PASAJERO YA REGISTRADO",
    footer: "Este código ya se registró hace menos de 2 horas.",
  },
  PENDIENTE: {
    tone: "bg-slate-600",
    emoji: "📶",
    title: "SIN CONEXIÓN — GUARDADO",
    footer: "Se sincronizará automáticamente cuando vuelva la señal.",
  },
  ERROR: {
    tone: "bg-slate-700",
    emoji: "⚠️",
    title: "ERROR AL PROCESAR",
    footer: "Intenta escanear nuevamente.",
  },
};

export default function AbordajePage() {
  const [profile, setProfile] = useState(null);
  const [mode, setMode] = useState("idle"); // idle | scanning | result
  const [result, setResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [online, setOnline] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((j) => setProfile(j.profile));
    refreshCache();
    setPendingCount(getQueue().length);
    setOnline(navigator.onLine);

    const onOnline = () => {
      setOnline(true);
      syncQueue();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const interval = setInterval(() => {
      if (navigator.onLine) syncQueue();
    }, 20000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshCache() {
    try {
      const res = await fetch("/api/scan/cache");
      if (!res.ok) return;
      const json = await res.json();
      saveLocalCache(json.items);
    } catch {
      // sin conexión: se usa la caché existente si la hay
    }
  }

  async function syncQueue() {
    const queue = getQueue();
    for (const item of queue) {
      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codigo: item.codigo, device_scan_id: item.device_scan_id, forzar: false }),
        });
        if (res.ok) {
          removeFromQueue(item.device_scan_id);
        }
      } catch {
        break; // seguimos sin conexión, reintentamos en el próximo ciclo
      }
    }
    setPendingCount(getQueue().length);
  }

  // Escaneo continuo: tras mostrar el resultado, vuelve sola a la cámara
  // (sin que el operador tenga que tocar la pantalla) para el siguiente
  // pasajero. `pausar()` cancela ese regreso automático.
  function scheduleReturn(resultado) {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setResult(null);
      setMode("scanning");
    }, autoReturnDelay(resultado));
  }

  function pausar() {
    clearTimeout(timerRef.current);
    setMode("idle");
    setResult(null);
  }

  const handleDecode = useCallback(async (codigo) => {
    const deviceScanId = genScanId();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, device_scan_id: deviceScanId, forzar: false }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error de servidor");

      setResult({ resultado: json.resultado, data: json, deviceScanId, offline: false });
      setMode("result");
      playScanFeedback(json.resultado);
      scheduleReturn(json.resultado);
    } catch (err) {
      // Sin conexión (o timeout): validar contra la caché local y encolar
      const local = lookupLocal(codigo);
      pushToQueue({ codigo, device_scan_id: deviceScanId, ts: Date.now() });
      setPendingCount(getQueue().length);

      let resultadoOffline;
      if (local) {
        resultadoOffline = local.estado === "ACTIVO" ? "AUTORIZADO" : "NO_AUTORIZADO";
        setResult({
          resultado: resultadoOffline,
          data: { passenger: local },
          deviceScanId,
          offline: true,
        });
      } else {
        resultadoOffline = "PENDIENTE";
        setResult({ resultado: resultadoOffline, data: { codigo }, deviceScanId, offline: true, sinCache: true });
      }
      setMode("result");
      playScanFeedback(resultadoOffline);
      scheduleReturn(resultadoOffline);
    }
  }, []);

  async function handleForzar() {
    if (!result) return;
    const codigo = result.data.record?.codigo_escaneado || result.data.codigo;
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, device_scan_id: genScanId(), forzar: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult({ resultado: json.resultado, data: json, offline: false });
      playScanFeedback(json.resultado);
      scheduleReturn(json.resultado);
    } catch (err) {
      alert(err.message);
    }
  }

  function startScanning() {
    setScanError("");
    setMode("scanning");
  }

  // ---------------- RESULT SCREEN ----------------
  if (mode === "result" && result) {
    const screen = SCREENS[result.resultado] || SCREENS.ERROR;
    const passenger = result.data.passenger || result.data.record;
    const isYaRegistrado = result.resultado === "YA_REGISTRADO";

    return (
      <div className={`min-h-[calc(100vh-56px)] ${screen.tone} flex flex-col items-center justify-center text-white p-6 text-center`}>
        <p className="text-7xl mb-4">{screen.emoji}</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight mb-1">{screen.title}</h1>

        {result.sinCache ? (
          <p className="text-white/80 mt-3 max-w-xs">
            No hay conexión ni datos guardados localmente para validar. El intento quedó guardado y se
            verificará al recuperar la señal.
          </p>
        ) : passenger ? (
          <div className="mt-6 bg-white/10 rounded-2xl px-6 py-5 max-w-xs w-full space-y-2">
            <p className="font-display text-xl font-bold">{passenger.nombre_completo}</p>
            <p className="text-white/70 text-sm tabular-nums">
              Identificación: {maskId(passenger.numero_identificacion || passenger.identificacion_pasajero) || passenger.identificacion_enmascarada}
            </p>
            <div className="flex justify-center gap-4 text-sm text-white/80 pt-1">
              <span>Turno: {passenger.turno}</span>
              <span>·</span>
              <span>{passenger.punto_recogida}</span>
            </div>
            {isYaRegistrado && result.data.registro_previo && (
              <p className="text-white/70 text-xs pt-2 border-t border-white/15 mt-2">
                Último registro: {formatDateTime(result.data.registro_previo.scanned_at)}
              </p>
            )}
          </div>
        ) : null}

        <p className="mt-6 font-semibold text-lg">{screen.footer}</p>
        {result.offline && !result.sinCache && (
          <p className="text-xs text-white/60 mt-2">Validado con datos locales · pendiente de confirmar en línea</p>
        )}

        <p className="mt-6 text-xs text-white/50">Volviendo a escanear automáticamente…</p>

        <div className="mt-4 flex flex-col gap-3 w-full max-w-xs">
          {isYaRegistrado && profile?.role === "ADMINISTRADOR" && !result.offline && (
            <button onClick={handleForzar} className="btn bg-white text-orange-700 h-12 font-bold">
              Permitir de todas formas
            </button>
          )}
          <button onClick={pausar} className="btn bg-white/15 text-white h-12 font-semibold hover:bg-white/25">
            ⏸ Pausar
          </button>
        </div>
      </div>
    );
  }

  // ---------------- SCANNING SCREEN ----------------
  if (mode === "scanning") {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-sand-900 flex flex-col items-center justify-center p-6">
        <h2 className="text-white font-display text-xl font-bold mb-6">Escaneando…</h2>
        <Scanner onDecode={handleDecode} onError={(msg) => setScanError(msg)} />
        {scanError && <p className="text-rose-300 text-sm mt-4 max-w-sm text-center">{scanError}</p>}
        <button
          onClick={() => setMode("idle")}
          className="mt-8 btn bg-white/10 text-white h-12 px-8 font-semibold hover:bg-white/15"
        >
          Cancelar
        </button>
      </div>
    );
  }

  // ---------------- IDLE SCREEN ----------------
  return (
    <div className="min-h-[calc(100vh-56px)] bg-sand-900 flex flex-col items-center justify-center p-6 text-center">
      <p className="text-brand-200/50 text-sm mb-2">{profile?.full_name}</p>
      <h1 className="font-display text-2xl font-bold text-white mb-10">Control de abordaje</h1>

      <button
        onClick={startScanning}
        className="w-56 h-56 rounded-full bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white flex flex-col items-center justify-center gap-3 shadow-2xl shadow-brand-900/50 transition-colors"
      >
        <span className="text-6xl">📷</span>
        <span className="font-display font-extrabold text-lg tracking-wide">ESCANEAR QR</span>
      </button>

      {!online && (
        <p className="mt-8 text-amber-300 text-sm">📶 Sin conexión — los escaneos se guardarán y sincronizarán después</p>
      )}
      {pendingCount > 0 && (
        <p className="mt-3 text-white/50 text-xs">{pendingCount} escaneo(s) pendientes de sincronizar</p>
      )}
    </div>
  );
}
