/** Oculta parcialmente un número de identificación: 100000001 -> ****0001 */
export function maskId(id) {
  if (!id) return "";
  const str = String(id);
  if (str.length <= 4) return "*".repeat(str.length);
  return "*".repeat(str.length - 4) + str.slice(-4);
}

export function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function todayBogota() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now); // YYYY-MM-DD
}

export const RESULT_LABELS = {
  AUTORIZADO: "Abordaje autorizado",
  NO_AUTORIZADO: "Pasajero inactivo",
  QR_NO_ENCONTRADO: "QR no encontrado",
  YA_REGISTRADO: "Pasajero ya registrado",
};

export const RESULT_STYLES = {
  AUTORIZADO: "bg-brand-100 text-brand-800 border-brand-300",
  NO_AUTORIZADO: "bg-rose-100 text-rose-800 border-rose-300",
  QR_NO_ENCONTRADO: "bg-amber-100 text-amber-800 border-amber-300",
  YA_REGISTRADO: "bg-orange-100 text-orange-800 border-orange-300",
};

/** Convierte un arreglo de objetos a CSV (separador ;, amigable con Excel es-CO) */
export function toCSV(rows, columns) {
  const escape = (val) => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (s.includes(";") || s.includes("\n") || s.includes('"')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const header = columns.map((c) => escape(c.label)).join(";");
  const lines = rows.map((row) =>
    columns.map((c) => escape(typeof c.value === "function" ? c.value(row) : row[c.value])).join(";")
  );
  return "﻿" + [header, ...lines].join("\r\n");
}
