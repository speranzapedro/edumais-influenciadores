import { lerRedes } from "@edu/db";
import { Aviso, Cartao, Pill } from "@edu/ui";
import { ExternalLink } from "lucide-react";
import { Topo } from "@/components/Topo";
import { exigirCriador, linkPublico } from "@/lib/sessao";
import { BotaoPublicar, FormPerfil, FormProduto, FormSenha } from "./Formularios";

export const dynamic = "force-dynamic";

const precoParaCampo = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));

export default async function PerfilPage({ searchParams }: { searchParams: Promise<{ "bem-vindo"?: string }> }) {
  const e = await exigirCriador();
  const sp = await searchParams;
  const publicado = e.produto.status === "publicado";
  const link = linkPublico(e.perfil.handle);
  return (
    <>
      <Topo titulo="Perfil e produto" subtitulo="É assim que seus seguidores veem você e o que você vende." />
      <div className="grid max-w-6xl gap-6 px-8 pb-10 pt-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {sp["bem-vindo"] && (
            <Aviso tom="lilas">
              Bem-vindo à Edu+! Comece pelo seu perfil público e pelo nome do produto. Depois, crie sua primeira trilha com o Edu em <b>Trilhas</b>.
            </Aviso>
          )}
          <Cartao className="p-6">
            <h2 className="mb-4 font-extrabold">Perfil público</h2>
            <FormPerfil perfil={{ nome: e.perfil.nome_publico, handle: e.perfil.handle, bio: e.perfil.bio, redes: lerRedes(e.perfil.redes) }} />
          </Cartao>
          <Cartao className="p-6" id="produto">
            <h2 className="mb-4 font-extrabold">Produto</h2>
            <FormProduto produto={{ nome: e.produto.nome, descricao: e.produto.descricao, preco: precoParaCampo(e.produto.preco_centavos) }} />
          </Cartao>
        </div>
        <div className="space-y-6">
          <Cartao className="h-fit p-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-extrabold">Sua página</h2>
              <Pill tom={publicado ? "verde" : "ambar"}>{publicado ? "No ar" : "Rascunho"}</Pill>
            </div>
            <p className="mb-4 text-sm text-suave">
              {publicado
                ? "Quem abrir o seu link pode criar a conta e começar as trilhas publicadas."
                : "Enquanto estiver em rascunho, o link mostra “em breve”. Publique depois de ter ao menos uma trilha publicada."}
            </p>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="mb-4 flex items-center gap-2 break-all text-sm font-semibold text-marca-700 hover:underline"
            >
              {link.replace(/^https?:\/\//, "")} <ExternalLink className="size-3.5 shrink-0" />
            </a>
            <BotaoPublicar publicado={publicado} />
          </Cartao>
          <Cartao className="h-fit p-6">
            <h2 className="mb-1 font-extrabold">Conta</h2>
            <p className="mb-4 text-sm text-suave">{e.usuario.email}</p>
            <FormSenha />
          </Cartao>
        </div>
      </div>
    </>
  );
}
