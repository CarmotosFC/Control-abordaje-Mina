/**
 * Utilidades compartidas (cliente y servidor) para la carga masiva de
 * pasajeros. El objetivo es tolerar variaciones razonables en los
 * encabezados del Excel/CSV que suba el usuario (mayúsculas, sin tildes,
 * nombres alternativos como "Cédula" en vez de "Número de identificación"),
 * en lugar de exigir una coincidencia exacta de texto.
 */

// Quita tildes/diacríticos, pasa a minúsculas y normaliza espacios.
export function normalizeHeader(h) {
  return String(h ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Encabezados aceptados (ya normalizados) para cada campo del pasajero.
const FIELD_ALIASES = {
  nombre_completo: [
    "nombre completo",
    "nombre",
    "nombres",
    "nombre del pasajero",
    "nombre y apellido",
    "nombres y apellidos",
  ],
  numero_identificacion: [
    "numero de identificacion",
    "numero identificacion",
    "identificacion",
    "cedula",
    "cc",
    "documento",
    "numero de documento",
    "numero documento",
    "id",
    "no. identificacion",
    "no identificacion",
  ],
  telefono: ["telefono", "celular", "numero de telefono", "numero celular", "tel", "movil"],
  turno: ["turno", "turno de trabajo", "turno asignado"],
  punto_recogida: [
    "punto de recogida",
    "punto recogida",
    "punto",
    "punto de recogida ",
    "ruta",
    "punto de embarque",
  ],
};

// Convierte un valor de celda (que puede venir como Date, {richText:[...]}
// o {formula, result} desde ExcelJS) en texto plano seguro.
export function cellToText(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toLocaleDateString("es-CO");
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((r) => r.text).join("");
    if (value.text != null) return String(value.text);
    if (value.result != null) return String(value.result);
    return "";
  }
  return String(value);
}

/**
 * Recibe una fila cruda (objeto { encabezadoOriginal: valor }) y devuelve
 * los 5 campos del pasajero ya identificados, sin importar cómo estén
 * escritos los encabezados originales.
 */
export function normalizeImportRow(raw) {
  const map = {};
  for (const [key, value] of Object.entries(raw || {})) {
    map[normalizeHeader(key)] = cellToText(value).trim();
  }

  function pick(aliases) {
    for (const alias of aliases) {
      const v = map[alias];
      if (v) return v;
    }
    return "";
  }

  return {
    nombre_completo: pick(FIELD_ALIASES.nombre_completo),
    numero_identificacion: pick(FIELD_ALIASES.numero_identificacion),
    telefono: pick(FIELD_ALIASES.telefono),
    turno: pick(FIELD_ALIASES.turno),
    punto_recogida: pick(FIELD_ALIASES.punto_recogida),
  };
}
