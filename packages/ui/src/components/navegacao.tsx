"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "./modal";

/**
 * Quantas telas do próprio app ficaram para trás nesta aba. Começa em 0 a cada carregamento
 * (link de fora, aba nova, recarregar): aí o "Voltar" não tem para onde voltar dentro do app.
 */
let profundidade = 0;
let vindoDoHistorico = false;
let ultimoCaminho: string | null = null;

/** Conta as navegações dentro do app. Vai uma vez no layout raiz de cada app. */
export function RastreadorNavegacao() {
  const caminho = usePathname();
  useEffect(() => {
    const marcar = () => {
      vindoDoHistorico = true;
    };
    window.addEventListener("popstate", marcar);
    return () => window.removeEventListener("popstate", marcar);
  }, []);
  useEffect(() => {
    // Compara com o último caminho visto: o efeito rodar de novo (modo estrito do React) não conta.
    if (ultimoCaminho === null || ultimoCaminho === caminho) {
      ultimoCaminho = caminho;
      return;
    }
    ultimoCaminho = caminho;
    profundidade = vindoDoHistorico ? Math.max(0, profundidade - 1) : profundidade + 1;
    vindoDoHistorico = false;
  }, [caminho]);
  return null;
}

/**
 * "Voltar" que volta para a tela anterior de verdade. Sem tela anterior do app (aberta direto, por
 * link ou em aba nova), vai para `padrao`.
 */
export function BotaoVoltar({ padrao, className, children }: { padrao: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Link
      href={padrao}
      className={className}
      onClick={(e) => {
        if (profundidade > 0) {
          e.preventDefault();
          router.back();
        }
      }}
    >
      {children}
    </Link>
  );
}

/**
 * Link dos termos dentro de um formulário: abre o texto por cima da tela, sem sair dela (nada do
 * que já foi digitado se perde). O modal vai para o body: dentro do <form>, o botão de fechar enviaria o formulário.
 */
export function LinkTermos({
  rotulo,
  titulo = "Termos de uso e privacidade",
  children,
}: {
  rotulo: React.ReactNode;
  titulo?: string;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="font-semibold text-marca-600 underline">
        {rotulo}
      </button>
      {aberto &&
        createPortal(
          <Modal aberto aoFechar={() => setAberto(false)} titulo={titulo} largura="max-w-2xl">
            {children}
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="mt-6 w-full rounded-2xl bg-marca-600 py-3 text-sm font-bold text-white hover:bg-marca-700"
            >
              Entendi
            </button>
          </Modal>,
          document.body,
        )}
    </>
  );
}
