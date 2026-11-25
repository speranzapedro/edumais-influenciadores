"use client";

import { Botao, Cartao } from "@edu/ui";
import { Check, Copy, Download } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Botao
      variante="contorno"
      tamanho="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1600);
      }}
    >
      {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copiado ? "Copiado" : "Copiar"}
    </Botao>
  );
}

/** Links prontos por rede (cada um grava a origem na assinatura) e o QR do link principal. */
export function LinksDivulgacao({
  principal,
  porRede,
  porProduto,
  handle,
}: {
  principal: string;
  porRede: { rede: string; link: string }[];
  /** Produtos publicados: o link leva direto à página do produto (e registra por onde o fã entrou). */
  porProduto: { nome: string; link: string }[];
  handle: string;
}) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(principal, { margin: 1, width: 720, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(null));
  }, [principal]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        <Cartao className="p-6">
          <h2 className="font-extrabold">Seu link</h2>
          <p className="text-sm text-suave">Para a bio, os stories e as descrições dos vídeos.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-linha bg-fundo p-3">
            <code className="min-w-0 flex-1 break-all text-sm font-semibold text-marca-700">{principal}</code>
            <BotaoCopiar texto={principal} />
          </div>
        </Cartao>
        {porProduto.length > 0 && (
          <Cartao className="p-6">
            <h2 className="font-extrabold">Um link para cada produto</h2>
            <p className="text-sm text-suave">Abre direto a página do produto, com a marca dele. A assinatura continua liberando todos.</p>
            <ul className="mt-4 divide-y divide-linha">
              {porProduto.map((p) => (
                <li key={p.link} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="w-40 truncate text-sm font-bold">{p.nome}</span>
                  <code className="min-w-0 flex-1 break-all text-xs text-tinta-2">{p.link}</code>
                  <BotaoCopiar texto={p.link} />
                </li>
              ))}
            </ul>
          </Cartao>
        )}
        <Cartao className="p-6">
          <h2 className="font-extrabold">Um link para cada rede</h2>
          <p className="text-sm text-suave">Use o link da rede onde você posta: em Vendas você vê de onde vem cada assinante.</p>
          <ul className="mt-4 divide-y divide-linha">
            {porRede.map((r) => (
              <li key={r.rede} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-24 text-sm font-bold">{r.rede}</span>
                <code className="min-w-0 flex-1 break-all text-xs text-tinta-2">{r.link}</code>
                <BotaoCopiar texto={r.link} />
              </li>
            ))}
          </ul>
        </Cartao>
      </div>
      <Cartao className="h-fit p-6 text-center">
        <h2 className="font-extrabold">QR code</h2>
        <p className="text-sm text-suave">Para lives, vídeos e eventos.</p>
        <div className="mx-auto mt-4 grid aspect-square w-full max-w-[260px] place-items-center rounded-2xl border border-linha bg-white p-3">
          {qr ? <img src={qr} alt="QR code do seu link" className="size-full" /> : <span className="text-xs text-suave">Gerando…</span>}
        </div>
        {qr && (
          <a href={qr} download={`edumais-${handle}.png`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-marca-700 hover:underline">
            <Download className="size-4" /> Baixar QR code
          </a>
        )}
      </Cartao>
    </div>
  );
}
