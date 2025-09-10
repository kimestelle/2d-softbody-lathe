'use client'
import { useEffect, useRef } from "react";

export default function BlobCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl2");
  }, []);

  return <canvas ref={canvasRef} width={400} height={400} />;
}
