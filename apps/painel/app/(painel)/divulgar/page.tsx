import { nomeDaOrigem, ORIGENS_DIVULGACAO } from "@edu/core";
import { Aviso } from "@edu/ui";
import Link from "next/link";
import { Topo } from "@/components/Topo";
import { exigirCriador, linkPublico } from "@/lib/sessao";
import { LinksDivulgacao } from "./LinksDivulgacao";

export const dynamic = "force-dynamic";

export default async function DivulgarPage() {
  const e = await exigirCriador();
  const handle = e.perfil.handle;
  return (
    <>
      <Topo titulo="Divulgar" subtitulo="Leve seus seguidores para a sua trilha." />
      <div className="space-y-6 px-8 pb-10 pt-4">
        {e.perfil.pagina_status !== "publicada" && (
          <Aviso tom="ambar">
            Sua página ainda está em rascunho: quem abrir o link vê “em breve”. Publique em{" "}
            <Link href="/perfil#produto" className="font-bold underline">
              Perfil e produto
            </Link>{" "}
            depois de publicar ao menos uma trilha.
          </Aviso>
        )}
        <LinksDivulgacao
          handle={handle}
          principal={linkPublico(handle)}
          porRede={ORIGENS_DIVULGACAO.map((o) => ({ rede: nomeDaOrigem(o), link: linkPublico(handle, o) }))}
        />
      </div>
    </>
  );
}
