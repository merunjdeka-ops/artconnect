"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  client_id: string;
  profiles: { full_name: string } | null;
};

type Props = {
  artistId: string;
  currentUser: { id: string; name: string } | null;
  dark?: boolean;
};

export default function CommentSection({ artistId, currentUser, dark = false }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function fetchComments() {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("profile_comments")
      .select("id, content, created_at, client_id, profiles(full_name)")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false });
    setComments((data as unknown as Comment[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchComments();
  }, [artistId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const supabase = getSupabase();
      const { error: insertError } = await supabase.from("profile_comments").insert({
        artist_id: artistId,
        client_id: currentUser!.id,
        content: content.trim(),
      });
      if (insertError) throw insertError;
      setContent("");
      await fetchComments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const supabase = getSupabase();
    await supabase.from("profile_comments").delete().eq("id", id);
    setComments(prev => prev.filter(c => c.id !== id));
  }

  function getInitial(name: string) {
    return name?.charAt(0)?.toUpperCase() || "?";
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  const d = dark;

  return (
    <div className="mb-12">
      <h2 className={`text-xs font-bold uppercase tracking-widest mb-6 ${d ? "text-white/30" : "text-black/40"}`}>
        Comments {comments.length > 0 && `(${comments.length})`}
      </h2>

      {/* Comment form */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className={`border p-5 mb-6 ${d ? "border-white/10 bg-[#111]" : "border-black bg-white"}`}>
          <div className="flex gap-3 items-start">
            <div className={`w-8 h-8 font-black text-sm flex items-center justify-center rounded-full shrink-0 mt-1 ${d ? "bg-[#E5000F] text-white" : "bg-black text-white"}`}>
              {getInitial(currentUser.name)}
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <textarea
                rows={3}
                placeholder="Ask a question or leave a comment…"
                value={content}
                onChange={e => setContent(e.target.value)}
                required
                className={`w-full border px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors resize-none bg-transparent ${d ? "border-white/20 text-white placeholder:text-white/20" : "border-black placeholder:text-black/30"}`}
              />
              {error && <p className="text-xs text-[#E5000F] uppercase tracking-widest">{error}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className={`px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${d ? "bg-[#E5000F] text-white hover:bg-white hover:text-black" : "bg-black text-white hover:bg-[#E5000F]"}`}
                >
                  {submitting ? "Posting…" : "Post Comment"}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className={`border p-5 mb-6 text-center ${d ? "border-white/10 bg-[#111]" : "border-black/20 bg-white"}`}>
          <p className={`text-sm mb-3 ${d ? "text-white/40" : "text-black/50"}`}>Log in to leave a comment</p>
          <a href="/login" className={`inline-block px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${d ? "bg-[#E5000F] text-white hover:bg-white hover:text-black" : "bg-black text-white hover:bg-[#E5000F]"}`}>
            Log In
          </a>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <p className={`text-xs uppercase tracking-widest ${d ? "text-white/20" : "text-black/30"}`}>Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className={`text-sm uppercase tracking-widest ${d ? "text-white/30" : "text-black/40"}`}>No comments yet. Be the first!</p>
      ) : (
        <div className={`flex flex-col gap-px border ${d ? "bg-white/10 border-white/10" : "bg-black border-black"}`}>
          {comments.map(comment => {
            const name = Array.isArray(comment.profiles)
              ? comment.profiles[0]?.full_name
              : comment.profiles?.full_name || "User";
            const isOwn = currentUser?.id === comment.client_id;

            return (
              <div key={comment.id} className={`px-5 py-4 ${d ? "bg-[#111]" : "bg-[#F2EDE4]"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 font-black text-sm flex items-center justify-center rounded-full shrink-0 mt-0.5 ${d ? "bg-[#E5000F] text-white" : "bg-black text-white"}`}>
                    {getInitial(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-xs font-black uppercase tracking-widest ${d ? "text-white" : ""}`}>{name}</span>
                      <span className={`text-xs shrink-0 ${d ? "text-white/20" : "text-black/30"}`}>{timeAgo(comment.created_at)}</span>
                    </div>
                    <p className={`text-sm leading-relaxed ${d ? "text-white/50" : "text-black/80"}`}>{comment.content}</p>
                    {isOwn && (
                      <button onClick={() => handleDelete(comment.id)} className={`mt-2 text-xs uppercase tracking-widest transition-colors hover:text-[#E5000F] ${d ? "text-white/20" : "text-black/30"}`}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
