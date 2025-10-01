'use client'
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Blob2D from "./Blob2D";
import BezierEditor from "./components/BezierEditor";
import TextureEditor from "./components/TextureEditor";

export default function BlobWithEditor() {
  //blob states
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobRef = useRef<Blob2D | null>(null); 
  const [pathData, setPathData] = useState("");
  const [texture, setTexture] = useState<HTMLCanvasElement | null>(null);
  const [u_wireframeMode, setU_WireframeMode] = useState(0);
  const [u_opacity, setU_Opacity] = useState(0.0);

  //ui states
  const [editModal, setEditModal] = useState<'bezier' | 'texture' | null>('bezier');

  useEffect(() => {
    if (canvasRef.current && pathData && !blobRef.current) {
      blobRef.current = new Blob2D(canvasRef.current, pathData);
      if (texture) blobRef.current.initTexture(texture);
    }
  }, [pathData, texture]);

  useEffect(() => {
    if (pathData && blobRef.current) {
      blobRef.current.updatePath(pathData);
    }
  }, [pathData]);

  const OpenBezierModal = () => {
    if (editModal === 'bezier') {
      setEditModal(null);
    } else {
    setEditModal('bezier');
    }
  };

  const OpenTextureModal = () => {
    if (editModal === 'texture') {
      setEditModal(null);
    } else {
    setEditModal('texture');
    }
  };

  useEffect(() => {
    if (texture && blobRef.current) {
      blobRef.current.updateTexture(texture);
    }
  }, [texture]);

  useEffect(() => {
    if (blobRef.current) {
      blobRef.current.updateOpacity(u_opacity);
    }
  }, [u_opacity]);

  const handleTextureChange = (canvas: HTMLCanvasElement) => {
    setTexture(canvas); 
    if (blobRef.current) {
      blobRef.current.updateTexture(canvas);
    }
  };

  const handleWireframeToggle = () => {
    setU_WireframeMode((prev) => (prev === 0 ? 1 : 0));
    if (blobRef.current) {
      blobRef.current.u_wireframeMode = u_wireframeMode === 0 ? 1 : 0;
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden justify-center items-center bg-grid-dark py-[15svh] px-[15svw]">
      <button onClick={handleWireframeToggle} 
      className="absolute top-[5svh] h-[7svh] aspect-square flex modal p-[0.75svh] rounded-full z-10">
        {u_wireframeMode === 0 ? (
          <Image src="/wireframe.svg" alt="Wireframe mode" width={48} height={48} />
        ) : (
          <Image src="/solid.svg" alt="Solid mode" width={48} height={48} />
        )}
      </button>
      <input type="range" 
        min={0} 
        max={1} 
        step={0.01} 
        value={u_opacity} 
        onChange={(e) => setU_Opacity(parseFloat(e.target.value))}
        className="absolute top-[15svh] w-[20svh] z-[15] cursor-pointer"
      />
      <div className='max-w-full max-h-full aspect-square flex justify-center items-center'>
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        className='w-full h-full z-[10] object-contain cursor-grab'
      />
      </div>

      <div className='absolute h-[7svh] w-[30svh] p-[1svh] bottom-[8svh] left-[10svw] flex justify-center'>
        <button 
          onClick={OpenBezierModal}
          className={`max-h-full aspect-[4/3] flex justify-center ${editModal == 'bezier' ? 'bg-gray-100 shadow-inner-lg border border-gray-200' : 'bg-white'} p-[0.5svh] rounded-l-full`}
        >
          <Image src="/bezier-icon.svg" alt='bezier curve editor' className="h-full w-auto" width={60} height={60}/>
        </button>
        <button 
          onClick={OpenTextureModal}
          className={`max-h-full aspect-[4/3] flex justify-center p-[0.5svh] ${editModal == 'texture' ? 'bg-gray-100 shadow-inner-lg border border-gray-200' : 'bg-white'} rounded-r-full`}
        >
          <Image src="/paint-icon.svg" alt='texture editor' className="h-full w-auto"  width={60} height={60}/>
        </button>
      </div>

      <div className={`absolute z-[15] h-[30svh] w-[30svh] bottom-[15svh] left-[10svw] flex modal ${editModal === 'bezier' ? 'block' : 'hidden'}`}>
        <BezierEditor onPathChange={setPathData} />
      </div>
      <div className={`absolute z-[15] h-[30svh] w-[30svh] bottom-[15svh] left-[10svw] flex modal ${editModal === 'texture' ? 'block' : 'hidden'}`}>
        <TextureEditor onTextureChange={handleTextureChange} />
      </div>
    </div>
  );
}
