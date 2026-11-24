"use client";

import { Aviso, Botao, Campo, CampoSenha } from "@edu/ui";
import { useState, useTransition } from "react";
import { alterarSenha, alternarPublicacao, salvarDadosProduto, salvarPerfil } from "./actions";

const classeArea =
  "w-full rounded-2xl border border-linha bg-superficie px-4 py-3 text-[15px] text-tinta outline-none transition placeholder:text-suave/70 focus:border-marca-400 focus:ring-4 focus:ring-marca-100";

type Msg = { tom: "verde" | "vermelho"; texto: string } | null;

function useEnvio(ok: string) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const enviar = (fn: () => Promise<{ erro: string } | { ok: true }>) =>
    iniciar(async () => {
      const r = await fn();
      setMsg("erro" in r ? { tom: "vermelho", texto: r.erro } : { tom: "verde", texto: ok });
    });
  return { pendente, msg, enviar };
}

export function FormPerfil({
  perfil,
}: {
  perfil: { nome: string; handle: string; bio: string | null; redes: { instagram?: string; tiktok?: string; youtube?: string } };
}) {
  const { pendente, msg, enviar } = useEnvio("Perfil salvo.");
  return (
    <form className="space-y-4" action={(form) => enviar(() => salvarPerfil(form))}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome público" name="nome" defaultValue={perfil.nome} required ajuda="Como seus seguidores conhecem você." />
        <Campo rotulo="Seu @ na Edu+" name="handle" defaultValue={perfil.handle} required ajuda="Vira o seu link: …/c/seu.arroba" />
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-tinta-2">Sobre você</span>
        <textarea
          name="bio"
          rows={3}
          maxLength={500}
          defaultValue={perfil.bio ?? ""}
          className={classeArea}
          placeholder="Uma apresentação curta que aparece na sua página e ajuda o Edu a falar com a sua voz."
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Instagram" name="instagram" defaultValue={perfil.redes.instagram ?? ""} placeholder="@seuperfil" />
        <Campo rotulo="TikTok" name="tiktok" defaultValue={perfil.redes.tiktok ?? ""} placeholder="@seuperfil" />
        <Campo rotulo="YouTube" name="youtube" defaultValue={perfil.redes.youtube ?? ""} placeholder="@seucanal" />
      </div>
      {msg && <Aviso tom={msg.tom}>{msg.texto}</Aviso>}
      <Botao disabled={pendente}>{pendente ? "Salvando…" : "Salvar perfil"}</Botao>
    </form>
  );
}

export function FormProduto({ produto }: { produto: { nome: string; descricao: string | null; preco: string } }) {
  const { pendente, msg, enviar } = useEnvio("Produto salvo.");
  return (
    <form className="space-y-4" action={(form) => enviar(() => salvarDadosProduto(form))}>
      <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr]">
        <Campo rotulo="Nome do produto" id="produto-nome" name="nome" defaultValue={produto.nome} required />
        <Campo
          rotulo="Preço da assinatura (R$/mês)"
          name="preco"
          defaultValue={produto.preco}
          placeholder="29,90"
          ajuda="Ainda sem cobrança: vale quando os pagamentos chegarem."
        />
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-tinta-2">O que o aluno vai aprender</span>
        <textarea
          name="descricao"
          rows={3}
          maxLength={600}
          defaultValue={produto.descricao ?? ""}
          className={classeArea}
          placeholder="Uma promessa curta e clara. Aparece na sua página."
        />
      </label>
      {msg && <Aviso tom={msg.tom}>{msg.texto}</Aviso>}
      <Botao disabled={pendente}>{pendente ? "Salvando…" : "Salvar produto"}</Botao>
    </form>
  );
}

export function BotaoPublicar({ publicado }: { publicado: boolean }) {
  const { pendente, msg, enviar } = useEnvio(publicado ? "Página fora do ar." : "Página publicada!");
  return (
    <div className="space-y-3">
      <Botao variante={publicado ? "contorno" : "primario"} disabled={pendente} onClick={() => enviar(() => alternarPublicacao(!publicado))}>
        {pendente ? "Salvando…" : publicado ? "Tirar a página do ar" : "Publicar minha página"}
      </Botao>
      {msg && <Aviso tom={msg.tom}>{msg.texto}</Aviso>}
    </div>
  );
}

export function FormSenha() {
  const { pendente, msg, enviar } = useEnvio("Senha alterada.");
  return (
    <form className="space-y-4" action={(form) => enviar(() => alterarSenha(form))}>
      <CampoSenha rotulo="Nova senha" name="senha" autoComplete="new-password" minLength={8} required />
      <CampoSenha rotulo="Repita a senha" name="confirmacao" autoComplete="new-password" minLength={8} required />
      {msg && <Aviso tom={msg.tom}>{msg.texto}</Aviso>}
      <Botao variante="contorno" disabled={pendente}>
        {pendente ? "Salvando…" : "Alterar senha"}
      </Botao>
    </form>
  );
}
