"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/Badge";
import { formatDateTime, RESULT_LABELS } from "@/lib/utils";

const PAGE_SIZE = 30;

const RESULT_TONE = {
  AUTORIZADO: "good",
  NO_AUTORIZADO: "bad",
  QR_NO_ENCONTRADO: "warn",
  YA_REGISTRADO: "orange",
};

export default function HistorialPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [turno, setTurno] = useState("");
  const [punto, setPunto] = useState("");
  const [resultado, setResultado] = useState("");

  const buildParams = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    if (fechaDesde) params.set("fechaDesde", fechaDesde);
    if (fechaHasta) params.set("fechaHasta", fechaHasta);
    if (turno) params.set("turno", turno);
    if (punto) params.set("punto", punto);
    if (resultado) params.set("resultado", resultado);
    return params;
  }, [page, search, fechaDesde, fechaHasta, turno, punto, resultado]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/boarding?${buildParams()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al cargar el historial");
      setRows(json.data);
      setTotal(json.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [search, fechaDesde, fechaHasta, turno, punto, resultado]);

  function handleExport() {
    const params = buildParams();
    params.delete("page");
    params.delete("pageSize");
    window.open(`/api/boarding/export?${params}`, "_blank");
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-sand-900 tracking-tight">Historial de abordajes</h1>
          <p className="text-sand-900/50 text-sm mt-0.5">{total} registros encontrados</p>
        </div>
        <button onClick={handleExport} className="btn-primary h-11 px-4">
          Exportar a CSV / Excel
        </button>
      </div>

      <div className="card p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <input className="input" placeholder="Buscar pasajero…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-2">
          <input type="date" className="input" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          <input type="date" className="input" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </div>
        <select className="input" value={resultado} onChange={(e) => setResultado(e.target.value)}>
          <option value="">Todos los resultados</option>
          <option value="AUTORIZADO">Abordaje autorizado</option>
          <option value="NO_AUTORIZADO">Pasajero inactivo</option>
          <option value="QR_NO_ENCONTRADO">QR no encontrado</option>
          <option value="YA_REGISTRADO">Pasajero ya registrado</option>
        </select>
        <input className="input" placeholder="Filtrar por turno…" value={turno} onChange={(e) => setTurno(e.target.value)} />
        <input className="input" placeholder="Filtrar por punto de recogida…" value={punto} onChange={(e) => setPunto(e.target.value)} />
      </div>

      {error && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2 mb-4">{error}</div>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-200 bg-sand-50/60 text-left text-sand-900/50 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Fecha y hora</th>
                <th className="px-4 py-3 font-semibold">Pasajero</th>
                <th className="px-4 py-3 font-semibold">Identificación</th>
                <th className="px-4 py-3 font-semibold">Turno</th>
                <th className="px-4 py-3 font-semibold">Punto</th>
                <th className="px-4 py-3 font-semibold">Resultado</th>
                <th className="px-4 py-3 font-semibold">Operador</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-sand-100 last:border-0 hover:bg-sand-50/40">
                  <td className="px-4 py-3 text-sand-900/70 tabular-nums whitespace-nowrap">{formatDateTime(r.scanned_at)}</td>
                  <td className="px-4 py-3 font-medium text-sand-900">{r.nombre_pasajero || "—"}</td>
                  <td className="px-4 py-3 text-sand-900/70 tabular-nums">{r.identificacion_pasajero || "—"}</td>
                  <td className="px-4 py-3 text-sand-900/70">{r.turno || "—"}</td>
                  <td className="px-4 py-3 text-sand-900/70">{r.punto_recogida || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={RESULT_TONE[r.resultado]}>{RESULT_LABELS[r.resultado] || r.resultado}</Badge>
                    {r.override && <span className="ml-1.5 text-[11px] text-sand-900/40">(autorizado por admin)</span>}
                  </td>
                  <td className="px-4 py-3 text-sand-900/50">{r.operador_nombre || "—"}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sand-900/40">
                    No hay registros con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-sand-100">
            <span className="text-xs text-sand-900/40">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary h-8 px-3 text-xs">
                Anterior
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary h-8 px-3 text-xs">
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
