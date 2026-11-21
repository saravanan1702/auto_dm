import { ImageResponse } from "next/og";

const SIZES = ["180", "192", "512"];

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }));
}

export async function GET(_: Request, { params }: RouteContext<"/pwa-icon/[size]">) {
  const { size } = await params;
  const s = SIZES.includes(size) ? Number(size) : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #feda75, #fa7e1e 25%, #d62976 50%, #962fbf 75%, #4f5bd5)",
          color: "white",
          fontSize: s * 0.42,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        DM
      </div>
    ),
    { width: s, height: s },
  );
}
