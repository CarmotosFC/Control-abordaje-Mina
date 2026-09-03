"use client";

import { useEffect, useRef } from "react";

const ELEMENT_ID = "qr-reader-region";

export default function Scanner({ onDecode, onError }) {
  const scannerRef = useRef(null);
  const runningRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;

      const instance = new Html5Qrcode(ELEMENT_ID, { verbose: false });
      scannerRef.current = instance;

      try {
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1 },
          (decodedText) => {
            if (runningRef.current) return;
            runningRef.current = true;
            onDecode(decodedText.trim());
          },
          () => {
            /* frame sin QR: ignorar, es normal en cada cuadro */
          }
        );
      } catch (err) {
        onError?.(err?.message || "No se pudo acceder a la cámara. Verifica los permisos del navegador.");
      }
    })();

    return () => {
      cancelled = true;
      const instance = scannerRef.current;
      if (instance) {
        instance
          .stop()
          .then(() => instance.clear())
          .catch(() => {});
      }
    };
  }, [onDecode, onError]);

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-square rounded-3xl overflow-hidden bg-black">
      <div id={ELEMENT_ID} className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
      <div className="pointer-events-none absolute inset-6 border-2 border-brand-400/70 rounded-2xl" />
      <div className="pointer-events-none absolute inset-x-6 top-6 h-1 bg-brand-300/0" />
    </div>
  );
}
