"use client";

import { useState } from "react";

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

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open page guide"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#FFE600] text-black font-black text-xl shadow-lg hover:scale-110 hover:bg-[#FFD000] transition-all flex items-center justify-center border-2 border-black"
        style={{ boxShadow: "3px 3px 0px #000" }}
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
