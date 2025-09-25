"use client";

import React, { useRef, useEffect, useState } from "react";

type TextureEditorProps = {
  width?: number;
  height?: number;
  onTextureChange?: (canvas: HTMLCanvasElement) => void;
};

const TextureEditor: React.FC<TextureEditorProps> = ({
  width = 256,
  height = 256,
  onTextureChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#9ac1ff");
  const [brushSize, setBrushSize] = useState(16);
  const [blur, setBlur] = useState(0);

  const getMousePos = (e: MouseEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  const startDrawing = (e: React.MouseEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (onTextureChange && canvasRef.current) {
      onTextureChange(canvasRef.current);
    }
  };

  const draw = (e: React.MouseEvent | MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = getMousePos(e);

    ctx.fillStyle = color;
    if (blur == 0) ctx.fillStyle = color;
    ctx.shadowBlur = blur;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const clearCanvas = () => { 
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    if (onTextureChange) {
      onTextureChange(canvas);
    }
  }

  const changeBrushSize = (size: number) => {
    setBrushSize(size);
  }

    const changeBlur = (b: number) => {
        setBlur(b);
    }

  useEffect(() => {
    console.log(color);
    }, [color]);

  return (
    <div className='flex relative h-full w-full flex-col justify-center items-center p-[1svh] pb-[0.5svh]'>
        <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className='h-[75%] w-[75%] aspect-square rounded-full cursor-crosshair'
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        />
        <button onClick={clearCanvas} className='absolute text-red-500 text-[2svh] font-mono top-[1svh] right-[1svh] rounded'>clear</button>
        <div className='h-[5svh] mt-[1svh] flex flex-row justify-center items-center gap-[2svh]'>
            <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)}
                className='custom-color cursor-pointer'
            />
            <div className='flex flex-col justify-center'>
                    <input 
                        type="range" 
                        min={4} 
                        max={64} 
                        value={brushSize} 
                        onChange={(e) => changeBrushSize(parseInt(e.target.value))}
                        className='custom-range size-range cursor-pointer my-[1svh]'
                    />
                    <input 
                        type="range" 
                        min={0} 
                        max={100} 
                        value={blur} 
                        onChange={(e) => changeBlur(parseInt(e.target.value))}
                        className='custom-range blur-range cursor-pointer my-[1svh]'
                    />
            </div>
        </div>
    </div>
  );
};

export default TextureEditor;
