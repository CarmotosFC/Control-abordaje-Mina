"use client";

import { useState, useEffect } from "react";
import { IconClose } from "./icons";

const empty = { nombre_completo: "", numero_identificacion: "", telefono: "", turno: "", punto_recogida: "" };

export default function PassengerModal({ open, onClose, onSaved, passenger, turnos = [], puntos = [] }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        passenger
          ? {
              nombre_completo: passenger.nombre_completo,
              numero_identificacion: passenger.numero_identificacion,
              telefono: passenger.telefono || "",
              turno: passenger.turno,
              punto_recogida: passenger.punto_recogida,
            }
          : empty
      );
      setError("");
    }
  }, [open, passenger]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = passenger ? `/api/passengers/${passenger.id}` : "/api/passengers";
      const method = passenger ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar el pasajero.");
      onSaved(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold text-sand-900">
            {passenger ? "Editar pasajero" : "Crear pasajero"}
          </h2>
          <button onClick={onClose} className="text-sand-900/40 hover:text-sand-900">
            <IconClose />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre completo</label>
            <input
              className="input"
              required
              value={form.nombre_completo}
              onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
              placeholder="Ej. Juan Pérez Gómez"
            />
          </div>
          <div>
            <label className="label">Número de identificación</label>
            <input
              className="input"
              required
              value={form.numero_identificacion}
              onChange={(e) => setForm({ ...form, numero_identificacion: e.target.value })}
              placeholder="Ej. 100000001"
            />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input
              className="input"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="Ej. 3000000001"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Turno</label>
              <input
                className="input"
                required
                list="turnos-list"
                value={form.turno}
                onChange={(e) => setForm({ ...form, turno: e.target.value })}
                placeholder="Turno A"
              />
              <datalist id="turnos-list">
                {turnos.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">Punto de recogida</label>
              <input
                className="input"
                required
                list="puntos-list"
                value={form.punto_recogida}
                onChange={(e) => setForm({ ...form, punto_recogida: e.target.value })}
                placeholder="Punto 1"
              />
              <datalist id="puntos-list">
                {puntos.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          </div>

          {error && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 h-11">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 h-11">
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
