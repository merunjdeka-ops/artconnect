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
};

export default function CommentSection({ artistId, currentUser }: Props) {
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
    setComments((data as Comment[]) || []);
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

  return (
    <div className="mb-12">
      <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-6">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h2>

      {/* Comment form */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="border border-black bg-white p-5 mb-6">
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 bg-black text-white font-black text-sm flex items-center justify-center rounded-full shrink-0 mt-1">
              {getInitial(currentUser.name)}
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <textarea
                rows={3}
                placeholder="Ask a question or leave a comment…"
                value={content}
                onChange={e => setContent(e.target.value)}
                required
                className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors resize-none placeholder:text-black/30 bg-transparent"
              />
              {error && <p className="text-xs text-[#E5000F] uppercase tracking-widest">{error}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="px-6 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Posting…" : "Post Comment"}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="border border-black/20 p-5 mb-6 text-center bg-white">
          <p className="text-sm text-black/50 mb-3">Log in to leave a comment</p>
          <a
            href="/login"
            className="inline-block px-6 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors"
          >
            Log In
          </a>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <p className="text-xs text-black/30 uppercase tracking-widest">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-black/40 uppercase tracking-widest">No comments yet. Be the first!</p>
      ) : (
        <div className="flex flex-col gap-px bg-black border border-black">
          {comments.map(comment => {
            const name = Array.isArray(comment.profiles)
              ? comment.profiles[0]?.full_name
              : comment.profiles?.full_name || "User";
            const isOwn = currentUser?.id === comment.client_id;

            return (
              <div key={comment.id} className="bg-[#F2EDE4] px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-black text-white font-black text-sm flex items-center justify-center rounded-full shrink-0 mt-0.5">
                    {getInitial(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-black uppercase tracking-widest">{name}</span>
                      <span className="text-xs text-black/30 shrink-0">{timeAgo(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-black/80 leading-relaxed">{comment.content}</p>
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="mt-2 text-xs text-black/30 hover:text-[#E5000F] uppercase tracking-widest transition-colors"
                      >
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
