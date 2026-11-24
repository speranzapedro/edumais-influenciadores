import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Ícone da Edu+: o símbolo de tendência sobre o gradiente lilás da marca. */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #9b87fb, #5a48d1)",
        borderRadius: 112,
      }}
    >
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: imagem gerada (ImageResponse), não é HTML na página */}
      <svg width="300" height="300" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 17l5-5 4 4 7-8" />
        <path d="M15 8h5v5" />
      </svg>
    </div>,
    size,
  );
}
