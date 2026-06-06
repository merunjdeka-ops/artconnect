"use client";

type StarRatingProps = {
  rating: number;
  max?: number;
  size?: "sm" | "md" | "lg";
};

export default function StarRating({ rating, max = 5, size = "md" }: StarRatingProps) {
  const sizeClass = size === "sm" ? "text-xs" : size === "lg" ? "text-xl" : "text-base";

  return (
    <span className={`inline-flex gap-0.5 font-mono ${sizeClass}`} aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(rating);
        return (
          <span key={i} className={filled ? "text-[#E5000F]" : "text-black/20"}>
            {filled ? "■" : "□"}
          </span>
        );
      })}
    </span>
  );
}
