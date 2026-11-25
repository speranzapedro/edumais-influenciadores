"use client";

import { normalizarSlug, slugDoNome } from "@edu/core";
import { AreaTexto, Aviso, Botao, Campo, classesInput, cn, useFormulario } from "@edu/ui";
import { useState } from "react";
import type { EstadoProduto } from "./actions";

/**
 * Nome, endereço e descrição do produto. No produto novo, o endereço acompanha o nome até a pessoa
 * mexer nele; depois fica como ela escreveu (o servidor normaliza e valida de novo).
 */
export function FormProduto({
  acao,
  handle,
  inicial,
  botao,
  avisoEndereco,
}: {
  acao: (estado: EstadoProduto, form: FormData) => Promise<EstadoProduto>;
  handle: string;
  inicial?: { nome: string; slug: string; descricao: string | null };
  botao: string;
  /** Aviso ao mudar o endereço de um produto que já existe (links divulgados param de funcionar). */
  avisoEndereco?: boolean;
}) {
  const { estado, pendente, form } = useFormulario(acao, null);
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [slug, setSlug] = useState(inicial?.slug ?? "");
  const [slugEditado, setSlugEditado] = useState(!!inicial);
  const endereco = slugEditado ? slug : nome.trim() ? slugDoNome(nome) : "";
  const mudouEndereco = !!inicial && normalizarSlug(slug) !== inicial.slug;

  return (
    <form className="space-y-5" {...form}>
      <Campo
        rotulo="Nome do produto"
        name="nome"
        required
        minLength={3}
        maxLength={80}
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Ex.: Inglês do Zero"
        ajuda="Aparece no app dos seus fãs. Dá para mudar depois."
      />
      <label className="block" htmlFor="campo-slug">
        <span className="mb-1.5 block text-sm font-semibold text-tinta-2">Endereço</span>
        <div className={cn(classesInput, "flex items-center gap-0 px-0 focus-within:border-marca-400 focus-within:ring-4 focus-within:ring-marca-100")}>
          <span className="shrink-0 select-none pl-4 text-suave">@{handle}/</span>
          <input
            id="campo-slug"
            name="slug"
            value={endereco}
            onChange={(e) => {
              setSlugEditado(true);
              setSlug(e.target.value.toLowerCase());
            }}
            onBlur={() => setSlug((s) => normalizarSlug(s))}
            maxLength={40}
            placeholder="ingles-do-zero"
            className="h-full min-w-0 flex-1 bg-transparent pr-4 outline-none"
            aria-describedby="ajuda-slug"
          />
        </div>
        <span id="ajuda-slug" className="mt-1 block text-xs text-suave">
          Letras minúsculas, números e hífen. É o link do produto dentro da sua página.
        </span>
      </label>
      {avisoEndereco && mudouEndereco && (
        <Aviso tom="ambar">Mudar o endereço faz os links antigos deste produto pararem de funcionar. O link da sua página continua o mesmo.</Aviso>
      )}
      <AreaTexto
        rotulo="O que o fã vai aprender"
        name="descricao"
        rows={3}
        maxLength={600}
        defaultValue={inicial?.descricao ?? ""}
        placeholder="Uma promessa curta e clara. Aparece na página do produto."
      />
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tom="verde">{estado.ok}</Aviso>}
      <Botao disabled={pendente}>{pendente ? "Salvando…" : botao}</Botao>
    </form>
  );
}
