"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/Badge";
import { IconClose } from "@/components/icons";

export default function UsuariosPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/users");
    const json = await res.json();
    setRows(json.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggle(u) {
    if (!confirm(`¿${u.active ? "Inactivar" : "Activar"} a ${u.full_name}?`)) return;
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/users/${u.id}/toggle`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRows((prev) => prev.map((r) => (r.id === u.id ? json.data : r)));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-sand-900 tracking-tight">Usuarios del sistema</h1>
          <p className="text-sand-900/50 text-sm mt-0.5">Administradores y operadores de transporte</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary h-11 px-4">
          + Crear usuario
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand-200 bg-sand-50/60 text-left text-sand-900/50 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Correo</th>
              <th className="px-4 py-3 font-semibold">Rol</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-sand-100 last:border-0">
                <td className="px-4 py-3 font-medium text-sand-900">{u.full_name}</td>
                <td className="px-4 py-3 text-sand-900/70">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge tone={u.role === "ADMINISTRADOR" ? "default" : "good"}>{u.role}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={u.active ? "good" : "bad"}>{u.active ? "Activo" : "Inactivo"}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleToggle(u)}
                    disabled={busyId === u.id}
                    className="btn-secondary h-8 px-3 text-xs"
                  >
                    {u.active ? "Inactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sand-900/40">
                  Sin usuarios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <CreateUserModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ full_name: "", email: "", role: "OPERADOR", password: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onCreated();
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
          <h2 className="font-display text-lg font-bold text-sand-900">Crear usuario</h2>
          <button onClick={onClose} className="text-sand-900/40 hover:text-sand-900">
            <IconClose />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre completo</label>
            <input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Correo electrónico</label>
            <input type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Rol</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="OPERADOR">Operador de transporte</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
          </div>
          <div>
            <label className="label">Contraseña inicial</label>
            <input
              type="text"
              className="input font-mono"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
            />
            <p className="text-xs text-sand-900/40 mt-1">Compártela con el usuario; podrá cambiarla luego.</p>
          </div>
          {error && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 h-11">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 h-11">
              {saving ? "Creando…" : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
