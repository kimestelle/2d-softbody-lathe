import React from 'react'
import { useState, useEffect } from "react";

interface Point {
  x: number;
  y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
}

const WIDTH = 300;
const HEIGHT = 600;

interface BezierEditorProps {
  onPathChange: (path: string) => void;
}

export default function BezierEditor({ onPathChange }: BezierEditorProps) {
  const [points, setPoints] = useState<Point[]>([
    //top endpoint
    {
      x: 300,
      y: 75,
      handleOut: { x: 165, y: 75 }, 
    },
    {
      x: 75,
      y: 300,
      handleIn: { x: 75, y: 180 },
      handleOut: { x: 75, y: 420 },
    },
    //bottom endpoint
    {
      x: 300,
      y: 525,
      handleIn: { x: 165, y: 525 }, 
    },
  ]);

  const [dragging, setDragging] = useState<{
    type: "point" | "handle";
    i: number;
    which?: "in" | "out";
  } | null>(null);

  const getPos = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
    svg: SVGSVGElement
  ) => {
    const pt = svg.createSVGPoint();
    if ("touches" in e && e.touches.length > 0) {
      pt.x = e.touches[0].clientX;
      pt.y = e.touches[0].clientY;
    } else {
      pt.x = (e as React.MouseEvent).clientX;
      pt.y = (e as React.MouseEvent).clientY;
    }
    return pt.matrixTransform(svg.getScreenCTM()?.inverse());
  };


  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    // up to 2 inner control points
    if (points.length >= 4) return;
    const svg = e.currentTarget as SVGSVGElement;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const x = cursorPt.x;
    const y = cursorPt.y;

    const dx = x - WIDTH;
    const dy = y - HEIGHT / 2;
    if (Math.sqrt(dx * dx + dy * dy) > 240) return;

    const offset = 75;
    const newPt: Point = {
      x,
      y,
      handleIn: { x: x, y: y - offset },
      handleOut: { x: x, y: y + offset },
    };

    setPoints((prev) => {
      const newPts = [...prev];
      newPts.splice(prev.length - 1, 0, newPt);
      return newPts;
    });
  };

  const startDrag =
    (type: "point" | "handle", i: number, which?: "in" | "out") =>
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setDragging({ type, i, which });
    };

  const handleMove = (e:  React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const svg = e.currentTarget as SVGSVGElement;
    const { x, y } = getPos(e, svg);

    if (x < 0 || x > WIDTH || y < 0 || y > HEIGHT) return;

    setPoints((prev) =>
      prev.map((p, i) => {
        if (i !== dragging.i) return p;

        if (dragging.type === "point") {
          if (i === 0 || i === prev.length - 1) return p; 
          const dx = x - p.x;
          const dy = y - p.y;
          return {
            ...p,
            x,
            y,
            handleIn: p.handleIn
              ? { x: p.handleIn.x + dx, y: p.handleIn.y + dy }
              : undefined,
            handleOut: p.handleOut
              ? { x: p.handleOut.x + dx, y: p.handleOut.y + dy }
              : undefined,
          };
        }

        if (dragging.type === "handle" && dragging.which) {
          if (i === 0) {
            return { ...p, handleOut: { x, y: p.y } };
          }
          if (i === prev.length - 1) {
            return { ...p, handleIn: { x, y: p.y } };
          }

          const cx = p.x;
          const cy = p.y;
          const dx = x - cx;
          const dy = y - cy;
          return {
            ...p,
            handleIn:
              dragging.which === "in"
                ? { x, y }
                : { x: cx - dx, y: cy - dy },
            handleOut:
              dragging.which === "out"
                ? { x, y }
                : { x: cx - dx, y: cy - dy },
          };
        }
        return p;
      })
    );
  };

  const buildPath = () => {
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      if (prev.handleOut && curr.handleIn) {
        d += ` C ${prev.handleOut.x},${prev.handleOut.y} ${curr.handleIn.x},${curr.handleIn.y} ${curr.x},${curr.y}`;
      } else {
        d += ` L ${curr.x},${curr.y}`;
      }
    }
    return d;
  };

  const pathData = buildPath();

  useEffect(() => {
    onPathChange(pathData);
  }, [pathData, onPathChange]);

  return (
    <div className="h-full w-[50%] right-[50%] rounded-l-[8%] overflow-hidden flex flex-col items-center">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
        onTouchStart={(e) => {e.stopPropagation()}}
        onTouchMove={(e) => {
          e.preventDefault();
          handleMove(e);
        }}
        onTouchEnd={() => setDragging(null)}
        className="cursor-crosshair w-full h-full overflow-visible bg-grid"
      >
        {/* center vertical line */}
        <line
          key={'center-v'}
          x1={WIDTH}
          y1={0}
          x2={WIDTH}
          y2={HEIGHT}
          stroke="#bbbbbbff"
          strokeWidth={2}
          strokeLinecap='round'
        />

        {/* bezier curve */}
        <path d={pathData} stroke="white" fill="none" strokeWidth={2} />

        {/* handle guidelines */}
        {points.map((p, i) => (
          <React.Fragment key={`lines-${i}`}>
            {p.handleIn && (
              <line
                key={`in-line-${i}`}
                x1={p.x}
                y1={p.y}
                x2={p.handleIn.x}
                y2={p.handleIn.y}
                stroke="#ccc"
              />
            )}
            {p.handleOut && (
              <line
                key={`out-line-${i}`}
                x1={p.x}
                y1={p.y}
                x2={p.handleOut.x}
                y2={p.handleOut.y}
                stroke="#ccc"
              />
            )}
          </React.Fragment>
        ))}

        {/* points */}
        {points.map((p, i) => (
          <circle
            key={`p-${i}`}
            cx={p.x}
            cy={p.y}
            r={10}
            fill={i === 0 || i === points.length - 1 ? "blue" : "red"}
            onMouseDown={startDrag("point", i)}
            onTouchStart={(e) => {
              e.stopPropagation();
              setDragging({ type: "point", i });
            }}
          />
        ))}

        {/* handles */}
        {points.map((p, i) => (
          <React.Fragment key={`handles-${i}`}>
            {p.handleIn && (
              <circle
                key={`h-in-${i}`}
                cx={p.handleIn.x}
                cy={p.handleIn.y}
                r={10}
                fill="orange"
                onMouseDown={startDrag("handle", i, "in")}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setDragging({ type: "handle", i, which: "in" });
                }}
              />
            )}
            {p.handleOut && (
              <circle
                key={`h-out-${i}`}
                cx={p.handleOut.x}
                cy={p.handleOut.y}
                r={10}
                fill="orange"
                onMouseDown={startDrag("handle", i, "out")}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setDragging({ type: "handle", i, which: "out" });
                }}
              />
            )}
          </React.Fragment>
        ))}
      </svg>
    </div>
  );
}