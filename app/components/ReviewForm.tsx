"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import StarRating from "./StarRating";

type ReviewFormProps = {
  artistId: string;
  clientId: string;
  onReviewSubmitted: () => void;
};

export default function ReviewForm({ artistId, clientId, onReviewSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }

    setStatus("sending");
    setError("");

    try {
      const supabase = getSupabase();
      const { error: insertError } = await supabase.from("reviews").insert({
        artist_id: artistId,
        client_id: clientId,
        rating,
        comment: comment.trim() || null,
      });

      if (insertError) throw insertError;
      setStatus("sent");
      onReviewSubmitted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit review.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="border border-black p-6 bg-white text-center">
        <p className="font-black uppercase text-green-700 tracking-widest">Review Submitted</p>
        <p className="text-xs text-black/50 mt-2 uppercase tracking-widest">Thank you for your feedback.</p>
      </div>
    );
  }

  const displayRating = hovered || rating;

  return (
    <div className="border border-black p-6 bg-white">
      <h3 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-5">Leave a Review</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3">Rating *</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                className={`font-mono text-2xl leading-none transition-colors ${
                  star <= displayRating ? "text-[#E5000F]" : "text-black/20"
                } hover:text-[#E5000F]`}
                aria-label={`Rate ${star} out of 5`}
              >
                {star <= displayRating ? "■" : "□"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2">Comment (optional)</label>
          <textarea
            rows={4}
            placeholder="Share your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors resize-none placeholder:text-black/30 bg-transparent"
          />
        </div>

        {error && (
          <p className="text-xs text-[#E5000F] uppercase tracking-widest">{error}</p>
        )}

        <button
          type="submit"
          disabled={status === "sending"}
          className="py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50"
        >
          {status === "sending" ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </div>
  );
}
