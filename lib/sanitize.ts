import DOMPurify from "dompurify";

// Sanitize rich-text caption HTML before rendering with dangerouslySetInnerHTML.
// Allowlist matches what RichCaptionEditor can produce (formatting, lists,
// alignment via style, font size) — everything else, especially scripts and
// event handlers, is stripped.
export function sanitizeCaption(html: string): string {
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "s", "strike", "br", "div", "p", "span", "ul", "ol", "li", "font"],
    ALLOWED_ATTR: ["size", "style"],
  });
}
