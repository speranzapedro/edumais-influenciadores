import type { ReactNode } from "react";

/**
 * Termos de uso e privacidade do Edu+ (versão beta). Fonte única dos dois textos: o do criador de
 * conteúdo (painel) e o do aluno que assina o produto de um criador (app). Ao mudar o texto,
 * atualize `TERMOS.versao` e `TERMOS.data`.
 */
export const TERMOS = {
  versao: "beta 2",
  data: "23 de novembro de 2026",
  contato: "pedro@edumais.app.br",
  idadeMinima: 12,
} as const;

const SEM_EMPRESA = "Nesta fase beta, o Edu+ é um projeto ainda sem empresa constituída, ou seja, sem razão social nem CNPJ.";
const IA_ENVIO =
  "Para gerar essas respostas, o texto que você escreve é enviado ao nosso provedor de IA, que não pode usá-lo para outros fins nem para treinar modelos.";
const FORNECEDORES =
  "hospedagem, banco de dados e provedor de IA, só para o app funcionar e sob contrato. Alguns ficam fora do Brasil, com as garantias exigidas pela LGPD.";
const SENSIVEIS =
  "Não envie ao Edu nem nas respostas abertas conteúdos ofensivos, dados de outras pessoas ou informações sensíveis sobre você, como saúde ou religião.";

/** Cláusula numerada: o texto segue o título na mesma linha; `lista`, se houver, vem embaixo. */
function Clausula({ n, titulo, children, lista }: { n: number; titulo: string; children?: ReactNode; lista?: string[] }) {
  return (
    <div>
      <p>
        <b>
          {n}. {titulo}.
        </b>
        {children ? <> {children}</> : null}
      </p>
      {lista && (
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          {lista.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const Email = () => (
  <a href={`mailto:${TERMOS.contato}`} className="font-semibold text-marca-600 underline">
    {TERMOS.contato}
  </a>
);

/** Linha de versão no topo de cada texto. */
export function VersaoTermos() {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-suave">
      Versão {TERMOS.versao} · atualizada em {TERMOS.data}
    </p>
  );
}

function Corpo({ children }: { children: ReactNode }) {
  return <div className="space-y-3.5 text-sm leading-relaxed text-tinta-2">{children}</div>;
}

/** Aluno (fã) que assina o produto de um criador: o Edu+ é o responsável pelos dados. */
export function TermosAluno() {
  return (
    <Corpo>
      <VersaoTermos />
      <Clausula n={1} titulo="O que é o Edu+">
        É um app de microaulas em que criadores de conteúdo ensinam os próprios seguidores. Você estuda nas trilhas dos criadores que assina, responde desafios
        e pode tirar dúvidas com o Edu, um tutor de inteligência artificial.
      </Clausula>
      <Clausula n={2} titulo="Versão beta">
        Este app é uma versão beta. Ele é oferecido como está: funções podem mudar ou sair, o app pode ficar fora do ar e pode ter erros. Se algo não funcionar,
        escreva para <Email />.
      </Clausula>
      <Clausula n={3} titulo="Como usar">
        {`Use o app só para estudar. Sua conta é pessoal: não compartilhe sua senha. ${SENSIVEIS}`}
      </Clausula>
      <Clausula n={4} titulo="Assinaturas">
        Cada criador define o que oferece no produto dele. Durante o lançamento, o acesso é gratuito (cortesia). Quando houver cobrança, o preço, a renovação e
        o cancelamento serão informados antes de você assinar, e você poderá cancelar quando quiser.
      </Clausula>
      <Clausula n={5} titulo="Quem cuida dos seus dados">
        O Edu+ é o responsável pelos seus dados. {SEM_EMPRESA} Quem responde pelo app e pelos dados é a equipe do projeto, pelo e-mail <Email />. Quando a
        empresa for aberta, estes termos serão atualizados e pediremos um novo aceite. Os conteúdos das trilhas são preparados pelos criadores, que respondem
        por eles.
      </Clausula>
      <Clausula
        n={6}
        titulo="Quais dados usamos"
        lista={[
          "Cadastro: nome e e-mail.",
          "Assinaturas: de quais criadores você assina, desde quando e por qual link você chegou.",
          "Estudo: aulas feitas, respostas aos desafios, respostas abertas e o feedback recebido, XP, dias de estudo e conquistas.",
          "Conversas com o Edu: suas perguntas, as respostas e as avaliações que você der.",
          "Segurança: data do aceite destes termos, acessos e endereço IP, para evitar abuso e invasão de conta.",
        ]}
      />
      <Clausula n={7} titulo="Para que usamos">
        Para liberar as trilhas que você assina, mostrar seu progresso, corrigir seus desafios e dar feedback. Não usamos seus dados para publicidade e não os
        vendemos.
      </Clausula>
      <Clausula n={8} titulo="Inteligência artificial">
        {`O feedback das respostas abertas e as respostas do Edu são gerados por IA, a partir do material que o criador enviou. A IA pode errar: na dúvida, confira em outras fontes. ${IA_ENVIO}`}
      </Clausula>
      <Clausula
        n={9}
        titulo="Quem vê o quê"
        lista={[
          "Cada criador vê o seu nome, a data em que você assinou, por qual link chegou e quantas aulas concluiu nas trilhas dele. Ele não vê o seu e-mail nem o que você faz com outros criadores.",
          `Fornecedores do Edu+: ${FORNECEDORES}`,
        ]}
      />
      <Clausula n={10} titulo="Por quanto tempo">
        Enquanto sua conta estiver ativa. Se você pedir a exclusão, ou ficar 12 meses sem usar o app, os dados são excluídos ou anonimizados em até 90 dias,
        salvo o que a lei obrigar a guardar.
      </Clausula>
      <Clausula n={11} titulo="Menores de 18 anos">
        {`Para usar o app, menores de 18 anos precisam que o responsável legal esteja de acordo. Menores de ${TERMOS.idadeMinima} anos não podem criar conta. Ao aceitar estes termos, você declara ter ${TERMOS.idadeMinima} anos ou mais e, se tiver menos de 18, que o seu responsável está de acordo.`}
      </Clausula>
      <Clausula n={12} titulo="Seus direitos">
        Você pode pedir acesso, correção, cópia ou exclusão dos seus dados e tirar dúvidas sobre o uso deles pelo e-mail <Email />.
      </Clausula>
      <Clausula n={13} titulo="Mudanças">
        Se estes termos mudarem, avisaremos no app e pediremos um novo aceite quando a mudança for importante.
      </Clausula>
    </Corpo>
  );
}

/** Criador de conteúdo: uso do painel, conteúdo, parceria e dados dos assinantes. */
export function TermosCriador() {
  return (
    <Corpo>
      <VersaoTermos />
      <Clausula n={1} titulo="O que é o Edu+ Criador">
        É o painel em que você transforma o seu conteúdo em trilhas de microaulas gamificadas com a ajuda de inteligência artificial, publica para os seus
        seguidores e acompanha assinaturas e vendas.
      </Clausula>
      <Clausula n={2} titulo="Versão beta e parceria">
        O Edu+ Criador é uma versão beta, oferecida só a criadores convidados. Funções, limites e condições podem mudar, o serviço pode ficar fora do ar e pode
        ter erros. A divisão da receita (70% para você e 30% para o Edu+), os pagamentos e os repasses seguem o contrato de parceria assinado à parte; enquanto
        não houver cobrança, o acesso dos seus assinantes é gratuito (cortesia).
      </Clausula>
      <Clausula n={3} titulo="Sua conta">
        A conta é pessoal e intransferível. Mantenha sua senha em sigilo e escreva para <Email /> se suspeitar de acesso indevido.
      </Clausula>
      <Clausula
        n={4}
        titulo="Seu conteúdo"
        lista={[
          "Você só envia conteúdo (PDF, DOCX, TXT ou MD) que é seu ou que tem direito de usar comercialmente.",
          "O conteúdo continua sendo seu. Você autoriza o Edu+ a guardá-lo, ler o texto e enviá-lo ao provedor de IA apenas para gerar e manter as suas trilhas e as respostas do Edu aos seus assinantes.",
          "O Edu+ não usa seu conteúdo para treinar modelos de IA nem o mostra a outros criadores.",
        ]}
      />
      <Clausula n={5} titulo="Conteúdo gerado pela IA">
        A IA propõe ementa, conceitos, aulas e desafios. Ela pode errar ou simplificar demais. Você revisa e aprova cada etapa antes de publicar e responde pelo
        conteúdo que publica. O Edu+ pode tirar do ar conteúdo que viole a lei, direitos de terceiros ou estes termos.
      </Clausula>
      <Clausula n={6} titulo="Limites de uso">
        O uso da IA tem uma cota por período, informada no painel. Podemos limitar ou suspender contas com uso abusivo ou contrário a estes termos.
      </Clausula>
      <Clausula n={7} titulo="Dados dos seus assinantes">
        Você vê o nome, a data de entrada, a origem e o progresso dos seus assinantes, sem o e-mail. Use esses dados apenas para acompanhar o seu produto: não
        os copie para outros fins nem os compartilhe.
      </Clausula>
      <Clausula n={8} titulo="Seus dados">
        O Edu+ é o responsável pelos seus dados. {SEM_EMPRESA} Quem responde pelo serviço e pelos dados é a equipe do projeto, pelo e-mail <Email />. Tratamos:
        nome, e-mail, perfil público, trilhas, conteúdos, histórico de uso da IA, acessos e endereço IP, para prestar o serviço, dar suporte, apurar vendas e
        manter a segurança. Não os vendemos nem usamos para publicidade.
      </Clausula>
      <Clausula n={9} titulo="Fornecedores">
        {`Hospedagem, banco de dados e provedor de IA tratam dados em nome do Edu+, só para o serviço funcionar e sob contrato. Alguns ficam fora do Brasil, com as garantias exigidas pela LGPD.`}
      </Clausula>
      <Clausula n={10} titulo="Encerramento">
        Você pode encerrar sua conta pelo e-mail <Email />, respeitando o contrato de parceria. Suas trilhas saem do app dos assinantes e seus dados e conteúdos
        são excluídos em até 90 dias, salvo o que a lei ou o contrato obrigar a guardar.
      </Clausula>
      <Clausula n={11} titulo="Seus direitos">
        Você pode pedir acesso, correção, cópia ou exclusão dos seus dados pelo e-mail <Email />.
      </Clausula>
      <Clausula n={12} titulo="Mudanças">
        Se estes termos mudarem, avisaremos no painel e pediremos um novo aceite quando a mudança for importante.
      </Clausula>
      <Clausula n={13} titulo="Lei aplicável">
        Estes termos seguem as leis brasileiras, em especial a Lei Geral de Proteção de Dados (LGPD).
      </Clausula>
    </Corpo>
  );
}
