"use client";

import { useState } from "react";
import { cdnUrl } from "@/lib/cloudinary";

// Interactive gallery + lightbox for a post's extra photos. The article text
// itself is server-rendered; only this zoom UI needs the client.
export default function PostGallery({ photos }: { photos: string[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-px bg-black border border-black mt-12">
        {photos.map(url => (
          <button key={url} onClick={() => setLightbox(url)} className="aspect-square overflow-hidden bg-black/5 cursor-zoom-in group">
            <img src={cdnUrl(url, "w_800,c_limit,q_auto,f_auto")} alt="" decoding="async" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          </button>
        ))}
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6" onClick={() => setLightbox(null)}>
          <button className="absolute top-5 right-6 text-white/60 hover:text-white text-3xl font-black leading-none">✕</button>
          <img src={cdnUrl(lightbox, "w_2000,c_limit,q_auto,f_auto")} alt="" className="max-h-[85vh] max-w-full object-contain" />
        </div>
      )}
    </>
  );
}
