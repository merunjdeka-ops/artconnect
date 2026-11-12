"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type NewsItem = {
  id: string;
  title: string;
  link: string;
  source: string | null;
  category: string | null;
  published_at: string | null;
};

export default function AdminNewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState("");

  async function reload() {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("news_items")
      .select("id, title, link, source, category, published_at")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(100);
    setItems((data as NewsItem[]) || []);
  }

  useEffect(() => {
    async function load() {
      await reload();
      setLoading(false);
    }
    load();
  }, []);

  async function handleRefresh() {
    setRefreshing(true); setMsg("");
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/cron/fetch-news", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data?.error || "Refresh failed."); return; }
      const feeds = Object.entries(data.feeds || {}).map(([name, v]) => `${name}: ${v}`).join(", ");
      setMsg(`Pulled ${data.fetched} items. ${feeds}`);
      await reload();
    } catch {
      setMsg("Refresh failed. Please try again.");
    } finally { setRefreshing(false); }
  }

  async function handleDelete(id: string) {
    const supabase = getSupabase();
    const { error } = await supabase.from("news_items").delete().eq("id", id);
    if (error) { setMsg("Delete failed: " + error.message); return; }
    setItems(prev => prev.filter(i => i.id !== id));
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Admin · News</p>
      <h1 className="text-5xl font-black uppercase leading-none mb-10">News</h1>

      <div className="border border-black bg-black text-white p-8 mb-8">
        <h2 className="text-lg font-black uppercase mb-2">Auto-updating news wire</h2>
        <p className="text-xs text-white/50 mb-5 max-w-lg">
          News is pulled automatically every day from PetaPixel (photography), Colossal (art), Dezeen (architecture),
          Creative Boom (design) and No Film School (film). Use the button to pull the latest items right now.
        </p>
        <button onClick={handleRefresh} disabled={refreshing} className="px-6 py-3 bg-[#E5000F] text-white text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors disabled:opacity-50">
          {refreshing ? "Refreshing..." : "Refresh News Now"}
        </button>
        {msg && <p className="text-xs text-white/70 mt-4 uppercase tracking-widest">{msg}</p>}
      </div>

      {loading ? (
        <p className="text-xs uppercase tracking-widest text-black/40 py-8">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-black/40 text-center py-12">No news yet — hit &quot;Refresh News Now&quot;.</p>
      ) : (
        <div className="flex flex-col gap-px bg-black border border-black">
          {items.map(n => (
            <div key={n.id} className="bg-[#F2EDE4] p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm truncate">{n.title}</h3>
                <p className="text-xs text-black/50 truncate">
                  {[n.category, n.source, n.published_at ? new Date(n.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <a href={n.link} target="_blank" rel="noopener noreferrer" className="text-xs text-black/50 uppercase tracking-widest hover:text-black transition-colors">View</a>
                <button onClick={() => handleDelete(n.id)} className="text-xs text-[#E5000F] uppercase tracking-widest hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
