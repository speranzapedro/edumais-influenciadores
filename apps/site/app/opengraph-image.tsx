import { ImageResponse } from "next/og";

export const alt = "Edu+ · Transforme sua audiência em alunos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraph() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: "#f5f5fb",
        color: "#1d1a3a",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #9b87fb, #5a48d1)",
          }}
        >
          {/* biome-ignore lint/a11y/noSvgWithoutTitle: imagem gerada (ImageResponse), não é HTML na página */}
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 17l5-5 4 4 7-8" />
            <path d="M15 8h5v5" />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 48, fontWeight: 800 }}>
          Edu<span style={{ color: "#6c5ce7" }}>+</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 84, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>
        <span>Transforme sua</span>
        <span>
          <span style={{ color: "#6c5ce7" }}>audiência</span>&nbsp;em alunos.
        </span>
      </div>
      <div style={{ display: "flex", fontSize: 28, color: "#4b4868" }}>
        Seu curso gamificado de microaulas no celular, coproduzido com a Edu+. Você fica com 70% de cada venda.
      </div>
    </div>,
    size,
  );
}
