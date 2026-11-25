"use client";

import { COR_MARCA, estiloDoTema, gerarTema, PRESETS_TEMA } from "@edu/core";
import { Aviso, Botao, Cartao, cn, EnvioImagem, SeletorCor } from "@edu/ui";
import { Check } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { salvarIdentidade } from "@/app/(painel)/marca-actions";
import { Celular } from "@/components/previa/Celular";
import { PreviaMarca } from "@/components/previa/PreviaMarca";
import { useEnvioMarca } from "@/lib/envioMarca";

interface Inicial {
  corPrimaria: string;
  corDestaque: string | null;
  logo: { caminho: string; url: string } | null;
}

/** Cores e logo do produto, com a prévia do app do fã atualizando ao vivo. */
export function FormIdentidade({ produtoId, nome, criador, inicial }: { produtoId: string; nome: string; criador: string; inicial: Inicial }) {
  const [primaria, setPrimaria] = useState(inicial.corPrimaria);
  const [destaque, setDestaque] = useState<string | null>(inicial.corDestaque);
  const [logo, setLogo] = useState(inicial.logo);
  const [msg, setMsg] = useState<{ tom: "verde" | "vermelho"; texto: string } | null>(null);
  const [salvando, iniciar] = useTransition();
  const { enviando, enviar } = useEnvioMarca();
  const tema = useMemo(() => gerarTema({ primaria, destaque }), [primaria, destaque]);
  const mudou = primaria !== inicial.corPrimaria || destaque !== inicial.corDestaque || logo?.caminho !== inicial.logo?.caminho;

  const salvar = () =>
    iniciar(async () => {
      const r = await salvarIdentidade(produtoId, { corPrimaria: primaria, corDestaque: destaque, logoPath: logo?.caminho ?? null });
      setMsg("erro" in r ? { tom: "vermelho", texto: r.erro } : { tom: "verde", texto: "Identidade salva." });
    });

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_auto]">
      <div className="space-y-6">
        <Cartao className="p-6">
          <h2 className="font-extrabold">Logo</h2>
          <p className="mb-4 text-sm text-suave">Aparece no topo do app dos seus fãs e na página do produto.</p>
          <EnvioImagem
            rotulo="Logo do produto"
            ajuda="PNG, JPG ou WEBP, até 2 MB. De preferência quadrado e com fundo transparente."
            url={logo?.url ?? null}
            enviando={enviando}
            aoEscolher={async (arquivo) => {
              const r = await enviar(arquivo);
              if ("erro" in r) return r.erro;
              setLogo(r);
              setMsg(null);
              return null;
            }}
            aoRemover={() => setLogo(null)}
          />
        </Cartao>

        <Cartao className="p-6">
          <h2 className="font-extrabold">Cores</h2>
          <p className="mb-4 text-sm text-suave">Escolha uma paleta pronta ou as suas cores. Os tons do app saem delas.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Paletas prontas">
            {PRESETS_TEMA.map((p) => {
              const ativa = p.primaria === primaria && p.destaque === destaque;
              return (
                // biome-ignore lint/a11y/useSemanticElements: botões funcionam como opções de um grupo de rádio
                <button
                  key={p.nome}
                  type="button"
                  role="radio"
                  aria-checked={ativa}
                  onClick={() => {
                    setPrimaria(p.primaria);
                    setDestaque(p.destaque);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl border p-2.5 text-left text-sm font-semibold transition",
                    ativa ? "border-marca-500 bg-marca-50" : "border-linha hover:bg-fundo",
                  )}
                >
                  <span className="flex shrink-0 -space-x-1.5" aria-hidden="true">
                    <span className="size-5 rounded-full ring-2 ring-superficie" style={{ background: p.primaria }} />
                    <span className="size-5 rounded-full ring-2 ring-superficie" style={{ background: p.destaque ?? p.primaria }} />
                  </span>
                  <span className="truncate">{p.nome}</span>
                  {ativa && <Check className="ml-auto size-4 shrink-0 text-marca-600" />}
                </button>
              );
            })}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SeletorCor rotulo="Cor principal" valor={primaria} aoMudar={setPrimaria} ajuda="Botões, topo e destaques do app." />
            <div>
              <SeletorCor
                rotulo="Cor de destaque"
                valor={destaque ?? primaria}
                aoMudar={setDestaque}
                ajuda={destaque ? "XP, selos e novidades." : "Sem destaque própria: usa a cor principal."}
              />
              {destaque && (
                <button type="button" onClick={() => setDestaque(null)} className="mt-1 text-xs font-semibold text-marca-700 hover:underline">
                  Usar a cor principal
                </button>
              )}
            </div>
          </div>
          {tema.ajustes.map((a) => (
            <Aviso key={a.cor} tom="ambar" className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span>{a.motivo}</span>
                <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                  <span className="size-4 rounded-full border border-linha" style={{ background: a.de }} aria-hidden="true" />
                  {a.de.toUpperCase()} →
                  <span className="size-4 rounded-full border border-linha" style={{ background: a.para }} aria-hidden="true" />
                  {a.para.toUpperCase()}
                </span>
              </div>
            </Aviso>
          ))}
        </Cartao>

        <div className="flex flex-wrap items-center gap-3">
          <Botao onClick={salvar} disabled={salvando || enviando || !mudou}>
            {salvando ? "Salvando…" : "Salvar identidade"}
          </Botao>
          {(primaria !== COR_MARCA || destaque) && (
            <Botao
              variante="fantasma"
              onClick={() => {
                setPrimaria(COR_MARCA);
                setDestaque(null);
              }}
            >
              Voltar às cores da Edu+
            </Botao>
          )}
          {msg && <Aviso tom={msg.tom}>{msg.texto}</Aviso>}
        </div>
      </div>

      <div className="xl:sticky xl:top-6 xl:self-start">
        <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-suave">Prévia do app do fã</div>
        <div style={estiloDoTema(tema.vars)}>
          <Celular className="h-[640px] min-h-0">
            <PreviaMarca nome={nome} criador={criador} logo={logo?.url ?? null} />
          </Celular>
        </div>
      </div>
    </div>
  );
}
