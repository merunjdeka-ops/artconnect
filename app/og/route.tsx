import { ImageResponse } from "next/og";

// Default social-share card (1200×630) for pages without their own image.
// Served at /og and referenced from the root metadata; kept off the
// opengraph-image file convention so it never overrides per-page images
// (event photos, artist avatars).
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", background: "#F2EDE4", color: "#000",
          padding: "72px 80px", borderBottom: "24px solid #E5000F",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, textTransform: "uppercase", color: "#E5000F", fontWeight: 700 }}>
          Creative marketplace · Italy
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 120, fontWeight: 900, lineHeight: 1, textTransform: "uppercase", letterSpacing: -4 }}>
            <span style={{ color: "#E5000F", fontStyle: "italic", fontWeight: 400, marginRight: 24 }}>the</span>
            Local Art Hub
          </div>
          <div style={{ display: "flex", fontSize: 40, marginTop: 28, color: "rgba(0,0,0,0.7)" }}>
            Book local artists · Find events · Read the local scene
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "rgba(0,0,0,0.5)" }}>thelocalarthub.com</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
