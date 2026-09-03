"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PassengerModal from "@/components/PassengerModal";
import Badge from "@/components/Badge";
import { maskId } from "@/lib/utils";
import { IconUpload, IconQr } from "@/components/icons";

const PAGE_SIZE = 25;

export default function PasajerosPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [turnos, setTurnos] = useState([]);
  const [puntos, setPuntos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [turno, setTurno] = useState("");
  const [punto, setPunto] = useState("");
  const [estado, setEstado] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (turno) params.set("turno", turno);
      if (punto) params.set("punto", punto);
      if (estado) params.set("estado", estado);
      const res = await fetch(`/api/passengers?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al cargar pasajeros");
      setRows(json.data);
      setTotal(json.total);
      setTurnos(json.turnos);
      setPuntos(json.puntos);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, turno, punto, estado]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [search, turno, punto, estado]);

  async function handleToggle(p) {
    const nuevoEstado = p.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    const verbo = nuevoEstado === "ACTIVO" ? "activar" : "inactivar";
    if (!confirm(`¿Seguro que deseas ${verbo} a ${p.nombre_completo}?`)) return;
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/passengers/${p.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRows((prev) => prev.map((r) => (r.id === p.id ? json.data : r)));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  function handleSaved(passenger) {
    setModalOpen(false);
    setEditing(null);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-sand-900 tracking-tight">Gestión de pasajeros</h1>
          <p className="text-sand-900/50 text-sm mt-0.5">{total} pasajeros registrados</p>
        </div>
        <div className="flex gap-2">
          <Link href="/pasajeros/importar" className="btn-secondary h-11 px-4">
            <IconUpload /> Importar
          </Link>
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="btn-primary h-11 px-4"
          >
            + Crear pasajero
          </button>
        </div>
      </div>

      <div className="card p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input
          className="input"
          placeholder="Buscar por nombre, identificación o código…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={turno} onChange={(e) => setTurno(e.target.value)}>
          <option value="">Todos los turnos</option>
          {turnos.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select className="input" value={punto} onChange={(e) => setPunto(e.target.value)}>
          <option value="">Todos los puntos</option>
          {puntos.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select className="input" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>

      {error && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2 mb-4">{error}</div>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-200 bg-sand-50/60 text-left text-sand-900/50 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Identificación</th>
                <th className="px-4 py-3 font-semibold">Teléfono</th>
                <th className="px-4 py-3 font-semibold">Turno</th>
                <th className="px-4 py-3 font-semibold">Punto de recogida</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">QR</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-sand-100 last:border-0 hover:bg-sand-50/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-sand-900">{p.nombre_completo}</p>
                    <p className="text-xs text-sand-900/40">{p.codigo_pasajero}</p>
                  </td>
                  <td className="px-4 py-3 text-sand-900/70 tabular-nums">{p.numero_identificacion}</td>
                  <td className="px-4 py-3 text-sand-900/70 tabular-nums">{p.telefono || "—"}</td>
                  <td className="px-4 py-3 text-sand-900/70">{p.turno}</td>
                  <td className="px-4 py-3 text-sand-900/70">{p.punto_recogida}</td>
                  <td className="px-4 py-3">
                    <Badge tone={p.estado === "ACTIVO" ? "good" : "bad"}>{p.estado}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/pasajeros/${p.id}/credencial`} className="inline-flex items-center gap-1.5 text-brand-700 hover:underline font-medium">
                      <IconQr /> Ver QR
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditing(p);
                          setModalOpen(true);
                        }}
                        className="btn-secondary h-8 px-3 text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggle(p)}
                        disabled={busyId === p.id}
                        className={`h-8 px-3 text-xs rounded-lg font-semibold border ${
                          p.estado === "ACTIVO"
                            ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                            : "border-brand-300 text-brand-700 hover:bg-brand-50"
                        }`}
                      >
                        {p.estado === "ACTIVO" ? "Inactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sand-900/40">
                    No se encontraron pasajeros con los filtros seleccionados.
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

      <PassengerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        passenger={editing}
        turnos={turnos}
        puntos={puntos}
      />
    </div>
  );
}
