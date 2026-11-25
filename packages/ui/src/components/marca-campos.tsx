"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { type ReactNode, useId, useRef, useState } from "react";
import { Botao, classesInput, cn } from "./base";

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Cor em #RRGGBB: o seletor nativo e o campo de texto andam juntos. O texto só vale quando completo;
 * enquanto a pessoa digita, a última cor válida continua valendo.
 */
export function SeletorCor({
  rotulo,
  valor,
  aoMudar,
  ajuda,
  name,
}: {
  rotulo: ReactNode;
  valor: string;
  aoMudar: (hex: string) => void;
  ajuda?: ReactNode;
  name?: string;
}) {
  const id = useId();
  const [texto, setTexto] = useState(valor);
  const [ultimo, setUltimo] = useState(valor);
  // Mudou por fora (ex.: escolheu uma paleta pronta): o texto acompanha.
  if (valor !== ultimo) {
    setUltimo(valor);
    setTexto(valor);
  }
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-tinta-2">
        {rotulo}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={typeof rotulo === "string" ? `${rotulo} (seletor)` : "Seletor de cor"}
          value={HEX.test(valor) ? valor : "#000000"}
          onChange={(e) => aoMudar(e.target.value.toLowerCase())}
          className="size-12 shrink-0 cursor-pointer rounded-2xl border border-linha bg-superficie p-1"
        />
        <input
          id={id}
          name={name}
          value={texto}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => {
            const t = e.target.value.trim();
            const comCerquilha = t.startsWith("#") ? t : `#${t}`;
            setTexto(comCerquilha);
            if (HEX.test(comCerquilha)) aoMudar(comCerquilha.toLowerCase());
          }}
          onBlur={() => setTexto(valor)}
          className={cn(classesInput, "font-mono uppercase")}
        />
      </div>
      {ajuda && <span className="mt-1 block text-xs text-suave">{ajuda}</span>}
    </div>
  );
}

/**
 * Escolha de imagem com prévia (logo do produto, foto do perfil). O envio fica com quem usa:
 * `aoEscolher` recebe o arquivo e devolve a mensagem de erro (ou null).
 */
export function EnvioImagem({
  rotulo,
  ajuda,
  url,
  formato = "quadrado",
  aoEscolher,
  aoRemover,
  enviando = false,
}: {
  rotulo: ReactNode;
  ajuda?: ReactNode;
  url: string | null;
  formato?: "quadrado" | "redondo";
  aoEscolher: (arquivo: File) => Promise<string | null>;
  aoRemover?: () => void;
  enviando?: boolean;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const id = useId();
  return (
    <div>
      <span id={`${id}-rotulo`} className="mb-1.5 block text-sm font-semibold text-tinta-2">
        {rotulo}
      </span>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "grid size-20 shrink-0 place-items-center overflow-hidden border border-linha bg-fundo",
            formato === "redondo" ? "rounded-full" : "rounded-2xl",
          )}
        >
          {url ? <img src={url} alt="" className="size-full object-contain" /> : <ImageUp className="size-7 text-suave" aria-hidden="true" />}
        </div>
        <div className="space-y-2">
          <input
            ref={entrada}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-labelledby={`${id}-rotulo`}
            onChange={async (e) => {
              const arquivo = e.target.files?.[0];
              e.target.value = "";
              if (!arquivo) return;
              setErro(await aoEscolher(arquivo));
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Botao type="button" variante="contorno" tamanho="sm" disabled={enviando} onClick={() => entrada.current?.click()}>
              <ImageUp className="size-3.5" /> {enviando ? "Enviando…" : url ? "Trocar imagem" : "Escolher imagem"}
            </Botao>
            {url && aoRemover && (
              <Botao type="button" variante="fantasma" tamanho="sm" disabled={enviando} onClick={aoRemover}>
                <Trash2 className="size-3.5" /> Remover
              </Botao>
            )}
          </div>
          {ajuda && <span className="block text-xs text-suave">{ajuda}</span>}
          {erro && (
            <span role="alert" className="block text-xs font-semibold text-vermelho">
              {erro}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
