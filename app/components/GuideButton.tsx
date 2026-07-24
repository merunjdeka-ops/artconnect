"use client";

import { useState, useRef, useEffect } from "react";

export type GuideStep = {
  title: string;
  description: string;
};

type Props = {
  title: string;
  steps: GuideStep[];
};

export default function GuideButton({ title, steps }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // offset from default bottom-right
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const didDrag = useRef(false);

  // Mouse drag
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    didDrag.current = false;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    setDragging(true);
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
      setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
    }
    function onMouseUp() {
      dragStart.current = null;
      setDragging(false);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // Touch drag
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    didDrag.current = false;
    dragStart.current = { mx: t.clientX, my: t.clientY, px: pos.x, py: pos.y };
    setDragging(true);
  }

  useEffect(() => {
    function onTouchMove(e: TouchEvent) {
      if (!dragStart.current) return;
      const t = e.touches[0];
      const dx = t.clientX - dragStart.current.mx;
      const dy = t.clientY - dragStart.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
      setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
    }
    function onTouchEnd() {
      dragStart.current = null;
      setDragging(false);
    }
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  function handleClick() {
    if (!didDrag.current) setOpen(true);
  }

  return (
    <>
      {/* Floating draggable button */}
      <button
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={handleClick}
        aria-label="Open page guide"
        className={`fixed z-40 w-14 h-14 rounded-full bg-[#FFE600] text-black font-black text-xl flex items-center justify-center border-2 border-black select-none ${
          dragging ? "cursor-grabbing scale-110" : "cursor-grab hover:scale-110 hover:bg-[#FFD000]"
        } transition-transform`}
        style={{
          boxShadow: "3px 3px 0px #000",
          bottom: `calc(1.5rem - ${pos.y}px)`,
          right: `calc(1.5rem - ${pos.x}px)`,
        }}
      >
        ?
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#FFE600] border-2 border-black w-full max-w-md max-h-[80vh] overflow-y-auto"
            style={{ boxShadow: "4px 4px 0px #000" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black sticky top-0 bg-[#FFE600]">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-black text-[#FFE600] font-black text-sm flex items-center justify-center rounded-full shrink-0">?</span>
                <h2 className="font-black uppercase text-base leading-tight">{title}</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center font-black text-lg hover:bg-black hover:text-[#FFE600] transition-colors rounded-full"
              >
                ✕
              </button>
            </div>

            {/* Steps */}
            <div className="px-6 py-5 flex flex-col gap-4">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <span className="w-7 h-7 bg-black text-[#FFE600] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-black uppercase text-sm leading-tight mb-0.5">{step.title}</p>
                    <p className="text-sm text-black/70 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 pb-5">
              <button
                onClick={() => setOpen(false)}
                className="w-full py-3 bg-black text-[#FFE600] text-xs font-black uppercase tracking-widest hover:bg-black/80 transition-colors"
              >
                Got it — close guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
