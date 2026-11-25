import { lerRedes, resumoProdutos } from "@edu/db";
import { Aviso, Cartao, Pill } from "@edu/ui";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Topo } from "@/components/Topo";
import { exigirCriador, linkPublico } from "@/lib/sessao";
import { BotaoPublicar, FormPerfil, FormPreco, FormSenha } from "./Formularios";

export const dynamic = "force-dynamic";

const precoParaCampo = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));

/** Perfil: dados públicos do criador, a página (link, preço, publicação) e a conta. Produtos ficam em /produtos. */
export default async function PerfilPage({ searchParams }: { searchParams: Promise<{ "bem-vindo"?: string }> }) {
  const e = await exigirCriador();
  const [sp, produtos] = await Promise.all([searchParams, resumoProdutos(e)]);
  const publicada = e.perfil.pagina_status === "publicada";
  const produtosPublicados = produtos.filter((p) => p.status === "publicado").length;
  const link = linkPublico(e.perfil.handle);
  return (
    <>
      <Topo titulo="Perfil" subtitulo="Seus dados públicos, a sua página e a sua conta." />
      <div className="grid max-w-6xl gap-6 px-8 pb-10 pt-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {sp["bem-vindo"] && (
            <Aviso tom="lilas">
              Bem-vindo à Edu+! Comece pelo seu perfil público. Depois, crie seu primeiro produto em{" "}
              <Link href="/produtos/novo" className="font-bold underline">
                Produtos
              </Link>{" "}
              e monte as trilhas dele com o Edu.
            </Aviso>
          )}
          <Cartao className="p-6">
            <h2 className="mb-4 font-extrabold">Perfil público</h2>
            <FormPerfil perfil={{ nome: e.perfil.nome_publico, handle: e.perfil.handle, bio: e.perfil.bio, redes: lerRedes(e.perfil.redes) }} />
          </Cartao>
          <Cartao className="h-fit p-6">
            <h2 className="mb-1 font-extrabold">Conta</h2>
            <p className="mb-4 text-sm text-suave">{e.usuario.email}</p>
            <FormSenha />
          </Cartao>
        </div>
        <div className="space-y-6">
          <Cartao className="h-fit space-y-5 p-6" id="pagina">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-extrabold">Sua página</h2>
                <Pill tom={publicada ? "verde" : "ambar"}>{publicada ? "No ar" : "Rascunho"}</Pill>
              </div>
              <p className="mb-3 text-sm text-suave">
                {publicada
                  ? "Quem abrir o seu link pode criar a conta, assinar e começar as trilhas dos seus produtos publicados."
                  : "Enquanto estiver em rascunho, o link mostra “em breve”. Publique depois de ter ao menos um produto publicado."}
              </p>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 break-all text-sm font-semibold text-marca-700 hover:underline"
              >
                {link.replace(/^https?:\/\//, "")} <ExternalLink className="size-3.5 shrink-0" />
              </a>
              <p className="mt-2 text-xs text-suave">
                {produtosPublicados} de {produtos.length} produto(s) publicado(s) ·{" "}
                <Link href="/produtos" className="font-semibold text-marca-700 hover:underline">
                  ver produtos
                </Link>
              </p>
            </div>
            <FormPreco preco={precoParaCampo(e.perfil.preco_centavos)} />
            <div className="border-t border-linha pt-5">
              <BotaoPublicar publicado={publicada} />
            </div>
          </Cartao>
        </div>
      </div>
    </>
  );
}
