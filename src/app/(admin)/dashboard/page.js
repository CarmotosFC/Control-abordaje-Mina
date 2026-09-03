"use client";

import { useEffect, useState, useCallback } from "react";
import { todayBogota, formatDate } from "@/lib/utils";

function KpiTile({ label, value, sub, tone = "default" }) {
  const tones = {
    default: "text-sand-900",
    good: "text-brand-700",
    bad: "text-rose-700",
    warn: "text-amber-700",
  };
  return (
    <div className="card p-5">
      <p className="text-[13px] font-medium text-sand-900/55">{label}</p>
      <p className={`font-display text-[32px] leading-tight font-extrabold mt-1 tabular-nums ${tones[tone]}`}>{value}</p>
      {sub && <p className="text-xs text-sand-900/40 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [fecha, setFecha] = useState(todayBogota());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (f) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard?fecha=${f}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al cargar el panel");
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(fecha);
  }, [fecha, load]);

  const maxSerie = data ? Math.max(1, ...data.serie7dias.map((d) => d.total_escaneos)) : 1;

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-sand-900 tracking-tight">Panel de control</h1>
          <p className="text-sand-900/50 text-sm mt-0.5">Indicadores de transporte de personal</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-sand-900/60">Fecha:</label>
          <input
            type="date"
            value={fecha}
            max={todayBogota()}
            onChange={(e) => setFecha(e.target.value)}
            className="input w-auto"
          />
        </div>
      </div>

      {error && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2 mb-4">{error}</div>}

      {data && (
        <>
          <p className="text-sm font-semibold text-sand-900/70 mb-3">Pasajeros ({formatDate(fecha)})</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <KpiTile label="Pasajeros registrados" value={data.pasajerosRegistrados} />
            <KpiTile label="Pasajeros activos" value={data.pasajerosActivos} tone="good" />
            <KpiTile label="Pasajeros inactivos" value={data.pasajerosInactivos} tone="bad" />
          </div>

          <p className="text-sm font-semibold text-sand-900/70 mb-3">Abordajes del día seleccionado</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <KpiTile label="Abordajes autorizados" value={data.abordajesDelDia} tone="good" />
            <KpiTile label="No autorizados" value={data.noAutorizados} tone="bad" />
            <KpiTile label="QR no encontrados" value={data.qrNoEncontrado} tone="warn" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <div className="card p-5">
              <p className="text-sm font-semibold text-sand-900/70 mb-4">Resumen del día</p>
              <dl className="space-y-3 text-sm">
                <Row label="Total de pasajeros esperados" value={data.totalEsperados} />
                <Row label="Total de pasajeros abordados" value={data.totalAbordados} />
                <Row label="Pasajeros pendientes" value={data.pendientes} />
                <Row label="Reintentos ya registrados" value={data.yaRegistrados} />
                <Row label="Intentos no autorizados (total)" value={data.intentosNoAutorizados} />
              </dl>

              <div className="mt-5">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm text-sand-900/60">Porcentaje de abordaje</span>
                  <span className="font-display font-extrabold text-xl text-brand-700 tabular-nums">
                    {data.porcentajeAbordaje}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-sand-100 overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, data.porcentajeAbordaje)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <p className="text-sm font-semibold text-sand-900/70 mb-4">Escaneos — últimos 7 días</p>
              <div className="flex items-end gap-2.5 h-40">
                {data.serie7dias.length === 0 && (
                  <p className="text-sm text-sand-900/40 self-center">Sin datos históricos aún.</p>
                )}
                {data.serie7dias.map((d) => (
                  <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[11px] text-sand-900/40 tabular-nums">{d.total_escaneos}</span>
                    <div
                      className="w-full rounded-t-md bg-brand-400"
                      style={{ height: `${Math.max(4, (d.total_escaneos / maxSerie) * 100)}%` }}
                      title={`${d.fecha}: ${d.total_escaneos} escaneos`}
                    />
                    <span className="text-[11px] text-sand-900/40">{d.fecha.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {loading && !data && <p className="text-sand-900/40 text-sm">Cargando indicadores…</p>}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sand-900/60">{label}</dt>
      <dd className="font-semibold text-sand-900 tabular-nums">{value}</dd>
    </div>
  );
}
