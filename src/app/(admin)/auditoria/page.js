"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 40;

const ACTION_LABELS = {
  CREAR_PASAJERO: "Creó un pasajero",
  EDITAR_PASAJERO: "Editó un pasajero",
  ACTIVAR_PASAJERO: "Activó un pasajero",
  INACTIVAR_PASAJERO: "Inactivó un pasajero",
  ELIMINAR_PASAJERO: "Eliminó un pasajero",
  IMPORTAR_PASAJEROS: "Importó pasajeros masivamente",
  PERMITIR_SEGUNDO_REGISTRO: "Autorizó un segundo registro de abordaje",
  CREAR_USUARIO: "Creó un usuario",
  ACTIVAR_USUARIO: "Activó un usuario",
  INACTIVAR_USUARIO: "Inactivó un usuario",
};

export default function AuditoriaPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit?page=${page}&pageSize=${PAGE_SIZE}`);
      const json = await res.json();
      setRows(json.data || []);
      setTotal(json.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      <h1 className="font-display text-2xl font-extrabold text-sand-900 tracking-tight">Log de auditoría</h1>
      <p className="text-sand-900/50 text-sm mt-0.5 mb-6">
        Registro inmutable de cambios administrativos: quién, cuándo y qué se modificó.
      </p>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-200 bg-sand-50/60 text-left text-sand-900/50 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Fecha y hora</th>
                <th className="px-4 py-3 font-semibold">Usuario</th>
                <th className="px-4 py-3 font-semibold">Acción</th>
                <th className="px-4 py-3 font-semibold">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-sand-100 last:border-0 hover:bg-sand-50/40 align-top">
                  <td className="px-4 py-3 text-sand-900/70 tabular-nums whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-sand-900">{r.user_name || "—"}</p>
                    <p className="text-xs text-sand-900/40">{r.user_email}</p>
                  </td>
                  <td className="px-4 py-3 text-sand-900/80">{ACTION_LABELS[r.action] || r.action}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="text-brand-700 text-xs font-medium hover:underline"
                    >
                      {expanded === r.id ? "Ocultar" : "Ver detalle"}
                    </button>
                    {expanded === r.id && (
                      <pre className="mt-2 text-[11px] bg-sand-50 rounded-lg p-3 overflow-x-auto max-w-md">
                        {JSON.stringify(r.detalles, null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sand-900/40">
                    Aún no hay eventos registrados.
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
