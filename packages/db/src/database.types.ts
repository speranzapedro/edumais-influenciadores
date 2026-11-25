// Tipos do schema (supabase/migrations), escritos à mão no formato do `supabase gen types`, com os
// textos fechados (status, tipos) como uniões literais. O CI gera os tipos a partir do banco e confere
// que estes batem com eles (packages/db/test/tipos.check.ts): mudou o schema, atualize aqui.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
/** Coluna jsonb `not null` (o `supabase gen types` gera `NonNullable<Json>`). */
export type JsonNaoNulo = NonNullable<Json>;

type Etapa = "visao" | "ementa" | "cards" | "aulas";
type EtapaStatus = "pendente" | "gerando" | "em_revisao" | "aprovada" | "desatualizada";
type TrilhaStatus = "rascunho" | "publicada" | "arquivada";
type UserRole = "admin" | "criador" | "aluno";
type UserStatus = "ativo" | "inativo";
type AssinaturaStatus = "cortesia" | "pendente" | "ativa" | "inadimplente" | "cancelada" | "expirada";

type Rel<Nome extends string, Col extends string, Tabela extends string> = {
  foreignKeyName: Nome;
  columns: [Col];
  isOneToOne: false;
  referencedRelation: Tabela;
  referencedColumns: ["id"];
};

type Tabela<Row, Opcionais extends keyof Row = never, Relacoes extends unknown[] = []> = {
  Row: Row;
  Insert: Omit<Row, Opcionais> & Partial<Pick<Row, Opcionais>>;
  Update: Partial<Row>;
  Relationships: Relacoes;
};

/** Base da resposta do Edu: o material (citou fontes), conhecimento geral sinalizado ou nenhuma. */
export type CategoriaEdu = "material" | "geral" | "sem_base";

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      users: Tabela<
        {
          id: string;
          auth_user_id: string;
          role: UserRole;
          status: UserStatus;
          nome: string;
          /** Sempre em minúsculas; único na plataforma. */
          email: string;
          avatar_url: string | null;
          ultimo_acesso_em: string | null;
          aceite_termos_em: string | null;
          onboarding_concluido_em: string | null;
          tour_estudio: string[];
          tutor_aviso_em: string | null;
          created_at: string;
          updated_at: string;
        },
        | "id"
        | "status"
        | "avatar_url"
        | "ultimo_acesso_em"
        | "aceite_termos_em"
        | "onboarding_concluido_em"
        | "tour_estudio"
        | "tutor_aviso_em"
        | "created_at"
        | "updated_at"
      >;
      tentativas_login: Tabela<{ id: number; chave: string; sucesso: boolean; created_at: string }, "id" | "created_at">;
      criador_perfis: Tabela<
        {
          user_id: string;
          /** @ do criador, sem o "@" (minúsculas, números, ponto e sublinhado); único na plataforma. */
          handle: string;
          nome_publico: string;
          bio: string | null;
          foto_url: string | null;
          redes: JsonNaoNulo;
          /** Preço mensal da assinatura do criador (libera todos os produtos publicados). */
          preco_centavos: number | null;
          /** A página /@criador aceita novos fãs só quando publicada. */
          pagina_status: "rascunho" | "publicada";
          pagina_publicada_em: string | null;
          created_at: string;
          updated_at: string;
        },
        "bio" | "foto_url" | "redes" | "preco_centavos" | "pagina_status" | "pagina_publicada_em" | "created_at" | "updated_at",
        [Rel<"criador_perfis_user_id_fkey", "user_id", "users">]
      >;
      produtos: Tabela<
        {
          id: string;
          criador_id: string;
          nome: string;
          descricao: string | null;
          /** Endereço do produto na página do criador (/@criador/<slug>); único por criador. */
          slug: string;
          /** Caminho no bucket de marcas (criadores/<criador>/<arquivo>.png|jpg|webp). */
          logo_path: string | null;
          /** Cor principal (#rrggbb); o tema do app do fã sai dela (gerarTema em @edu/core). */
          cor_primaria: string;
          cor_destaque: string | null;
          /** Ordem do produto na página do criador. */
          ordem: number;
          status: "rascunho" | "publicado";
          publicado_em: string | null;
          created_at: string;
          updated_at: string;
        },
        "id" | "descricao" | "logo_path" | "cor_primaria" | "cor_destaque" | "ordem" | "status" | "publicado_em" | "created_at" | "updated_at",
        [Rel<"produtos_criador_id_fkey", "criador_id", "users">]
      >;
      assinaturas: Tabela<
        {
          id: string;
          /** O fã assina o criador: libera todos os produtos publicados dele. */
          criador_id: string;
          /** Produto pelo qual o fã entrou (relatório "entrou por"); null se veio pela página do criador. */
          produto_id: string | null;
          aluno_id: string;
          status: AssinaturaStatus;
          valor_centavos: number;
          origem: string | null;
          iniciada_em: string;
          expira_em: string | null;
          cancelada_em: string | null;
          provedor: string | null;
          referencia_externa: string | null;
          created_at: string;
          updated_at: string;
        },
        | "id"
        | "produto_id"
        | "status"
        | "valor_centavos"
        | "origem"
        | "iniciada_em"
        | "expira_em"
        | "cancelada_em"
        | "provedor"
        | "referencia_externa"
        | "created_at"
        | "updated_at",
        [
          Rel<"assinaturas_criador_id_fkey", "criador_id", "users">,
          Rel<"assinaturas_produto_id_fkey", "produto_id", "produtos">,
          Rel<"assinaturas_aluno_id_fkey", "aluno_id", "users">,
        ]
      >;
      trilhas: Tabela<
        {
          id: string;
          produto_id: string;
          criador_id: string;
          titulo: string;
          descricao: string | null;
          cor: string;
          icone: string;
          status: TrilhaStatus;
          /** Ordem da trilha na página do criador. */
          ordem: number;
          ementa: Json | null;
          publicada_em: string | null;
          tutor_ativo: boolean;
          orientacao_objetivo: string | null;
          orientacao_conteudos: string | null;
          orientacao_complementos: string | null;
          created_at: string;
          updated_at: string;
        },
        | "id"
        | "descricao"
        | "cor"
        | "icone"
        | "status"
        | "ordem"
        | "ementa"
        | "publicada_em"
        | "tutor_ativo"
        | "orientacao_objetivo"
        | "orientacao_conteudos"
        | "orientacao_complementos"
        | "created_at"
        | "updated_at",
        [
          {
            foreignKeyName: "trilhas_produto_id_criador_id_fkey";
            columns: ["produto_id", "criador_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id", "criador_id"];
          },
        ]
      >;
      respostas_quiz: Tabela<
        {
          id: number;
          user_id: string;
          aula_id: string;
          bloco_id: string;
          bloco_ordem: number;
          pergunta: string;
          tipo: "quiz" | "completar" | "ordenar";
          /** Só no quiz; nos outros desafios a resposta fica em `resposta`. */
          opcao: number | null;
          resposta: Json | null;
          correta: boolean;
          modo: "aula" | "revisao";
          tentativa: string;
          respondida_em: string;
        },
        "id" | "modo" | "respondida_em" | "tipo" | "resposta" | "opcao",
        [Rel<"respostas_quiz_aula_id_fkey", "aula_id", "aulas">]
      >;
      respostas_abertas: Tabela<
        {
          id: number;
          user_id: string;
          aula_id: string;
          bloco_id: string;
          bloco_ordem: number;
          pergunta: string;
          tentativa: string;
          modo: "aula" | "revisao";
          resposta: string;
          feedback: string;
          classificacao: "adequada" | "parcial" | "inadequada" | null;
          criterios: Json | null;
          modelo: string;
          tokens_entrada: number;
          tokens_saida: number;
          tokens_cache: number;
          custo_usd: number;
          duracao_ms: number | null;
          criada_em: string;
        },
        "id" | "modo" | "classificacao" | "criterios" | "tokens_entrada" | "tokens_saida" | "tokens_cache" | "custo_usd" | "duracao_ms" | "criada_em",
        [Rel<"respostas_abertas_aula_id_fkey", "aula_id", "aulas">]
      >;
      notificacoes: Tabela<
        {
          id: string;
          user_id: string;
          tipo: string;
          titulo: string;
          corpo: string | null;
          link: string | null;
          /** Criador do aviso (o fã vê no app daquele criador); null = aviso geral. */
          criador_id: string | null;
          lida_em: string | null;
          created_at: string;
        },
        "id" | "corpo" | "link" | "criador_id" | "lida_em" | "created_at"
      >;
      audit_log: Tabela<
        {
          id: number;
          ator_id: string | null;
          acao: string;
          entidade: string;
          entidade_id: string | null;
          dados: JsonNaoNulo;
          created_at: string;
        },
        "id" | "ator_id" | "entidade_id" | "dados" | "created_at",
        [Rel<"audit_log_ator_id_fkey", "ator_id", "users">]
      >;
      materiais: Tabela<
        {
          id: string;
          trilha_id: string;
          storage_path: string;
          nome: string;
          mime: string;
          tamanho_bytes: number | null;
          paginas: number | null;
          status: string;
          erro: string | null;
          created_at: string;
        },
        "id" | "tamanho_bytes" | "paginas" | "status" | "erro" | "created_at"
      >;
      material_trechos: Tabela<{ id: number; material_id: string; trilha_id: string; pagina: number; texto: string; tsv: unknown }, "id" | "tsv">;
      trilha_etapas: Tabela<
        {
          trilha_id: string;
          etapa: Etapa;
          status: EtapaStatus;
          versao_atual: number;
          versao_aprovada: number | null;
          qualidade: Json | null;
          gerando_desde: string | null;
          revisoes: JsonNaoNulo;
          updated_at: string;
        },
        "status" | "versao_atual" | "versao_aprovada" | "qualidade" | "gerando_desde" | "revisoes" | "updated_at"
      >;
      etapa_versoes: Tabela<
        {
          id: string;
          trilha_id: string;
          etapa: Etapa;
          versao: number;
          snapshot: JsonNaoNulo;
          autor: "agente" | "criador";
          resumo: string | null;
          created_at: string;
        },
        "id" | "resumo" | "created_at"
      >;
      agente_mensagens: Tabela<
        {
          id: string;
          trilha_id: string;
          etapa: Etapa;
          role: string;
          texto: string;
          eventos: JsonNaoNulo;
          foco: Json | null;
          versao: number | null;
          created_at: string;
        },
        "id" | "texto" | "eventos" | "foco" | "versao" | "created_at"
      >;
      agente_execucoes: Tabela<
        {
          id: string;
          trilha_id: string | null;
          etapa: Etapa | null;
          tipo: string;
          status: string;
          modelo: string | null;
          iteracoes: number;
          input_tokens: number;
          output_tokens: number;
          cache_read_tokens: number;
          cache_write_tokens: number;
          custo_usd: number;
          duracao_ms: number | null;
          erro: string | null;
          created_at: string;
          finalizada_em: string | null;
        },
        | "id"
        | "trilha_id"
        | "etapa"
        | "status"
        | "modelo"
        | "iteracoes"
        | "input_tokens"
        | "output_tokens"
        | "cache_read_tokens"
        | "cache_write_tokens"
        | "custo_usd"
        | "duracao_ms"
        | "erro"
        | "created_at"
        | "finalizada_em"
      >;
      skill_cards: Tabela<
        {
          id: string;
          trilha_id: string;
          codigo: string;
          ordem: number;
          titulo: string;
          conceito: string;
          pontos_chave: JsonNaoNulo;
          exemplo: string | null;
          topico_ids: string[];
          fontes: JsonNaoNulo;
        },
        "id" | "pontos_chave" | "exemplo" | "topico_ids" | "fontes"
      >;
      aulas: Tabela<
        {
          id: string;
          trilha_id: string;
          codigo: string;
          modulo_id: string;
          modulo_titulo: string | null;
          ordem: number;
          titulo: string;
          objetivo: string | null;
          skill_card_codigos: string[];
          arquivada_em: string | null;
        },
        "id" | "modulo_titulo" | "objetivo" | "skill_card_codigos" | "arquivada_em",
        [Rel<"aulas_trilha_id_fkey", "trilha_id", "trilhas">]
      >;
      aula_blocos: Tabela<{ id: string; aula_id: string; ordem: number; tipo: string; conteudo: JsonNaoNulo }, "id">;
      aula_conclusoes: Tabela<{ user_id: string; aula_id: string; acertos: number; total: number; concluida_em: string }, "acertos" | "total" | "concluida_em">;
      trilha_conclusoes: Tabela<{ user_id: string; trilha_id: string; concluida_em: string }, "concluida_em">;
      /** Dias em que o fã estudou com cada criador (a ofensiva é por criador). */
      dias_ativos_criador: Tabela<{ user_id: string; criador_id: string; dia: string }>;
      xp_eventos: Tabela<
        {
          id: string;
          user_id: string;
          /** O XP é por criador: cada criador tem o próprio placar do fã. */
          criador_id: string;
          fonte: string;
          ref_key: string;
          pontos: number;
          descricao: string | null;
          criado_em: string;
        },
        "id" | "descricao" | "criado_em"
      >;
      conquistas_criador: Tabela<{ user_id: string; criador_id: string; conquista_key: string; desbloqueada_em: string }, "desbloqueada_em">;
      tutor_indices: Tabela<
        {
          trilha_id: string;
          status: "pendente" | "indexando" | "pronto" | "erro";
          mapa: string | null;
          mapa_tokens: number | null;
          modelo_embedding: string | null;
          trechos: number;
          tokens: number;
          tokens_embedding: number;
          erro: string | null;
          indexado_em: string | null;
          indexando_desde: string | null;
          solicitado_em: string | null;
          sugestoes: Json | null;
          sugestoes_hash: string | null;
          updated_at: string;
        },
        | "status"
        | "mapa"
        | "mapa_tokens"
        | "modelo_embedding"
        | "trechos"
        | "tokens"
        | "tokens_embedding"
        | "erro"
        | "indexado_em"
        | "indexando_desde"
        | "solicitado_em"
        | "sugestoes"
        | "sugestoes_hash"
        | "updated_at"
      >;
      tutor_trechos: Tabela<
        {
          id: number;
          trilha_id: string;
          origem: "material" | "aula" | "card";
          material_id: string | null;
          aula_id: string | null;
          card_id: string | null;
          pagina_inicio: number | null;
          pagina_fim: number | null;
          avaliativo: boolean;
          secao_hash: string;
          ordem: number;
          caminho: string;
          texto: string;
          tokens: number;
          tsv: unknown;
          /** halfvec(1024): o PostgREST lê e grava como texto "[0.1,0.2,…]". */
          embedding: string | null;
          modelo_embedding: string | null;
          created_at: string;
        },
        "id" | "material_id" | "aula_id" | "card_id" | "pagina_inicio" | "pagina_fim" | "avaliativo" | "tsv" | "embedding" | "modelo_embedding" | "created_at"
      >;
      tutor_mensagens: Tabela<
        {
          id: string;
          trilha_id: string;
          user_id: string;
          conversa_id: string;
          role: "user" | "assistant";
          texto: string;
          trechos: Json | null;
          uso: Json | null;
          avaliacao: "util" | "nao_ajudou" | null;
          motivo: string | null;
          avaliada_em: string | null;
          aula_id: string | null;
          created_at: string;
        },
        "id" | "trechos" | "uso" | "avaliacao" | "motivo" | "avaliada_em" | "aula_id" | "created_at",
        [Rel<"tutor_mensagens_aula_id_fkey", "aula_id", "aulas">]
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      buscar_trechos: {
        Args: { p_trilha: string; p_consulta: string; p_limite?: number };
        Returns: { material_id: string; material_nome: string; pagina: number; rank: number; trecho: string }[];
      };
      tutor_buscar: {
        Args: { p_trilha: string; p_consulta: string; p_embedding: string | null; p_limite?: number; p_modo?: "hibrida" | "lexica" | "semantica" };
        Returns: {
          id: number;
          origem: "material" | "aula" | "card";
          material_id: string | null;
          aula_id: string | null;
          card_id: string | null;
          pagina_inicio: number | null;
          pagina_fim: number | null;
          avaliativo: boolean;
          caminho: string;
          texto: string;
          tokens: number;
          pos_lexica: number | null;
          pos_semantica: number | null;
          score: number;
        }[];
      };
      tutor_perguntas_hoje: { Args: { p_user: string; p_tz: string }; Returns: number };
    };
    Enums: {
      etapa: Etapa;
      etapa_status: EtapaStatus;
      trilha_status: TrilhaStatus;
      user_role: UserRole;
      user_status: UserStatus;
      assinatura_status: AssinaturaStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tabelas = Database["public"]["Tables"];
export type Row<T extends keyof Tabelas> = Tabelas[T]["Row"];
export type EtapaStatusDb = EtapaStatus;
export type UserRoleDb = UserRole;
export type UserStatusDb = UserStatus;
export type AssinaturaStatusDb = AssinaturaStatus;
