"use client";

import { useState } from "react";
import Link from "next/link";
import Papa from "papaparse";

export default function ImportarPage() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setResult(null);
    setRows([]);

    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        if (parsed.errors?.length) {
          setParseError("El archivo CSV tiene errores de formato en algunas líneas.");
        }
        setRows(parsed.data);
      } else {
        const ExcelJS = (await import("exceljs")).default;
        const buf = await file.arrayBuffer();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf);
        const ws = wb.worksheets[0];
        const headerRow = ws.getRow(1).values.slice(1).map((h) => String(h || "").trim());
        const data = [];
        ws.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const values = row.values.slice(1);
          const obj = {};
          headerRow.forEach((h, i) => (obj[h] = values[i] != null ? String(values[i]) : ""));
          data.push(obj);
        });
        setRows(data);
      }
    } catch (err) {
      setParseError("No se pudo leer el archivo. Verifica que sea un .csv o .xlsx válido.");
    }
  }

  async function handleImport() {
    setLoading(true);
    setResult(null);
    try {
      const normalized = rows.map((r) => ({
        nombre_completo: r["Nombre completo"] || r.nombre_completo || r.Nombre || "",
        numero_identificacion: r["Número de identificación"] || r.numero_identificacion || r.Identificacion || "",
        telefono: r["Teléfono"] || r.telefono || r.Telefono || "",
        turno: r["Turno"] || r.turno || "",
        punto_recogida: r["Punto de recogida"] || r.punto_recogida || r["Punto de Recogida"] || "",
      }));

      const res = await fetch("/api/passengers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: normalized }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al importar");
      setResult(json);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto">
      <Link href="/pasajeros" className="text-sm text-sand-900/50 hover:text-sand-900">
        ← Volver a pasajeros
      </Link>

      <h1 className="font-display text-2xl font-extrabold text-sand-900 tracking-tight mt-3">Importar pasajeros</h1>
      <p className="text-sand-900/50 text-sm mt-1 mb-6">
        Carga un archivo Excel (.xlsx) o CSV con las columnas: Nombre completo, Número de identificación,
        Teléfono, Turno, Punto de recogida.
      </p>

      <div className="card p-6">
        <label className="block border-2 border-dashed border-sand-200 rounded-xl p-8 text-center cursor-pointer hover:border-brand-400 transition-colors">
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
          <p className="font-medium text-sand-900">{fileName || "Selecciona un archivo .csv o .xlsx"}</p>
          <p className="text-xs text-sand-900/40 mt-1">Máximo 5000 registros por carga</p>
        </label>

        {parseError && <p className="text-rose-700 text-sm mt-3">{parseError}</p>}

        {rows.length > 0 && !result && (
          <div className="mt-5">
            <p className="text-sm text-sand-900/60 mb-3">{rows.length} filas detectadas. Vista previa:</p>
            <div className="overflow-x-auto rounded-lg border border-sand-200 mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-sand-50 text-left text-sand-900/50">
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Identificación</th>
                    <th className="px-3 py-2">Teléfono</th>
                    <th className="px-3 py-2">Turno</th>
                    <th className="px-3 py-2">Punto</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-sand-100">
                      <td className="px-3 py-2">{r["Nombre completo"] || r.nombre_completo}</td>
                      <td className="px-3 py-2">{r["Número de identificación"] || r.numero_identificacion}</td>
                      <td className="px-3 py-2">{r["Teléfono"] || r.telefono}</td>
                      <td className="px-3 py-2">{r["Turno"] || r.turno}</td>
                      <td className="px-3 py-2">{r["Punto de recogida"] || r.punto_recogida}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={handleImport} disabled={loading} className="btn-primary h-11 px-5">
              {loading ? "Procesando…" : `Importar ${rows.length} registros`}
            </button>
          </div>
        )}

        {result && result.error && (
          <div className="mt-5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2">
            {result.error}
          </div>
        )}

        {result && !result.error && (
          <div className="mt-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Stat label="Procesados" value={result.procesados} />
              <Stat label="Creados" value={result.creados} tone="good" />
              <Stat label="Duplicados" value={result.duplicados} tone="warn" />
              <Stat label="Con errores" value={result.conErrores} tone="bad" />
            </div>
            {result.detalles?.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-sand-200 max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-sand-50">
                    <tr className="text-left text-sand-900/50">
                      <th className="px-3 py-2">Fila</th>
                      <th className="px-3 py-2">Identificación</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.detalles.map((d, i) => (
                      <tr key={i} className="border-t border-sand-100">
                        <td className="px-3 py-2">{d.fila}</td>
                        <td className="px-3 py-2">{d.numero_identificacion}</td>
                        <td className="px-3 py-2">{d.estado}</td>
                        <td className="px-3 py-2">{d.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <Link href="/pasajeros" className="btn-primary h-11 px-5">
                Ver pasajeros
              </Link>
              <button
                onClick={() => {
                  setResult(null);
                  setRows([]);
                  setFileName("");
                }}
                className="btn-secondary h-11 px-5"
              >
                Importar otro archivo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "default" }) {
  const tones = { default: "text-sand-900", good: "text-brand-700", bad: "text-rose-700", warn: "text-amber-700" };
  return (
    <div className="rounded-xl bg-sand-50 border border-sand-200 p-3 text-center">
      <p className={`font-display text-2xl font-extrabold tabular-nums ${tones[tone]}`}>{value}</p>
      <p className="text-xs text-sand-900/50 mt-0.5">{label}</p>
    </div>
  );
}
