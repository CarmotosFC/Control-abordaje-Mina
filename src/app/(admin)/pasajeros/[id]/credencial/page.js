"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function CredencialPage() {
  const { id } = useParams();
  const router = useRouter();
  const [passenger, setPassenger] = useState(null);
  const [error, setError] = useState("");
  const canvasRef = useRef(null);

  useEffect(() => {
    fetch(`/api/passengers/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Pasajero no encontrado");
        setPassenger(json.data);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  async function handleDownload() {
    if (!passenger) return;
    const canvas = document.createElement("canvas");
    const W = 640,
      H = 860;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Fondo
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#e8ddc4";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // Encabezado
    ctx.fillStyle = "#12402d";
    ctx.fillRect(0, 0, W, 110);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("CONTROL DE TRANSPORTE", W / 2, 65);

    // Nombre
    ctx.fillStyle = "#12402d";
    ctx.font = "bold 30px Arial";
    wrapText(ctx, passenger.nombre_completo, W / 2, 165, 560, 34);

    // Código de usuario
    ctx.fillStyle = "#5b6b60";
    ctx.font = "16px Arial";
    ctx.fillText("Código de usuario", W / 2, 235);
    ctx.fillStyle = "#186241";
    ctx.font = "bold 26px monospace";
    ctx.fillText(passenger.codigo_pasajero, W / 2, 268);

    // QR
    const qrImg = await loadImage(`/api/passengers/${id}/qr`);
    const qrSize = 360;
    ctx.drawImage(qrImg, (W - qrSize) / 2, 300, qrSize, qrSize);

    // Instrucción
    ctx.fillStyle = "#5b6b60";
    ctx.font = "18px Arial";
    ctx.fillText("Presentar este código QR al abordar el vehículo.", W / 2, 700);

    ctx.fillStyle = "#9a9184";
    ctx.font = "13px Arial";
    ctx.fillText(`Turno: ${passenger.turno}  ·  Punto: ${passenger.punto_recogida}`, W / 2, 735);

    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `QR_${passenger.codigo_pasajero}.png`;
    a.click();
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-rose-700 mb-3">{error}</p>
        <button onClick={() => router.back()} className="btn-secondary h-10 px-4">
          Volver
        </button>
      </div>
    );
  }

  if (!passenger) return <div className="p-8 text-sand-900/40">Cargando…</div>;

  return (
    <div className="p-5 lg:p-8 max-w-lg mx-auto">
      <div className="no-print flex items-center justify-between mb-6">
        <Link href="/pasajeros" className="text-sm text-sand-900/50 hover:text-sand-900">
          ← Volver a pasajeros
        </Link>
      </div>

      <div className="print-area card overflow-hidden">
        <div className="bg-brand-900 text-white text-center py-5">
          <p className="font-display font-extrabold tracking-wide text-lg">CONTROL DE TRANSPORTE</p>
        </div>
        <div className="p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-sand-900">{passenger.nombre_completo}</h1>
          <p className="text-xs text-sand-900/40 uppercase tracking-wide mt-4">Código de usuario</p>
          <p className="font-mono font-bold text-xl text-brand-700 mt-1">{passenger.codigo_pasajero}</p>

          <img
            src={`/api/passengers/${id}/qr`}
            alt={`Código QR de ${passenger.nombre_completo}`}
            className="mx-auto my-6 w-64 h-64 rounded-xl border border-sand-200"
          />

          <p className="text-sand-900/60 text-sm">Presentar este código QR al abordar el vehículo.</p>
          <p className="text-sand-900/35 text-xs mt-2">
            Turno: {passenger.turno} · Punto: {passenger.punto_recogida}
          </p>
        </div>
      </div>

      <div className="no-print flex gap-3 mt-6">
        <button onClick={() => window.print()} className="btn-secondary flex-1 h-11">
          Imprimir QR
        </button>
        <button onClick={handleDownload} className="btn-primary flex-1 h-11">
          Descargar QR
        </button>
      </div>
    </div>
  );
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  const lines = [];
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}
