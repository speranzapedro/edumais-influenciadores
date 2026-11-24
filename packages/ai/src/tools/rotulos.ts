/** Rótulo exibido enquanto o modelo ainda está escrevendo a chamada (antes de a tool rodar). */
export function rotularEscrevendo(nome: string): string {
  const mapa: Record<string, string> = {
    definir_ementa: "🧭 Montando a ementa completa…",
    definir_estrutura: "🧭 Montando módulos e tópicos…",
    corrigir_aulas: "🛠️ Aplicando correções…",
    criar_skill_cards: "🃏 Escrevendo Cards de Conhecimento…",
    planejar_aulas: "🗺️ Planejando as aulas…",
    escrever_aula: "📝 Escrevendo uma aula…",
    revisar_qualidade: "🧑‍🏫 Preparando a revisão…",
    buscar_nos_materiais: "🔎 Buscando nos materiais…",
    ler_paginas: "📖 Lendo páginas…",
  };
  return mapa[nome] ?? "✏️ Editando o rascunho…";
}

/** Rótulos amigáveis das ações do agente, exibidos como chips no estúdio. */
export function rotularTool(nome: string, input: unknown): string {
  // biome-ignore lint/suspicious/noExplicitAny: a entrada vem de várias tools diferentes; só lemos campos conhecidos para o rótulo.
  const i = (input ?? {}) as Record<string, any>;
  const n = (x: unknown[] | undefined) => (Array.isArray(x) ? x.length : 0);
  switch (nome) {
    case "listar_materiais":
      return "📚 Listou os materiais";
    case "buscar_nos_materiais":
      return `🔎 Buscou “${i.consulta}”`;
    case "ler_paginas":
      return `📖 Leu p. ${i.pagina_inicio}–${i.pagina_fim}`;
    case "ver_rascunho":
      return i.item_id ? `👀 Conferiu ${i.item_id}` : "👀 Releu o rascunho";
    case "revisar_qualidade":
      return "🧑‍🏫 Pediu revisão pedagógica";
    case "definir_ementa":
    case "definir_estrutura":
      return `🧭 Montou a ementa (${n(i.modulos)} módulos)`;
    case "atualizar_dados_gerais":
      return "✏️ Ajustou dados gerais";
    case "adicionar_modulo":
      return `➕ Novo módulo “${i.titulo}”`;
    case "editar_modulo":
      return `✏️ Editou ${i.modulo_id}`;
    case "remover_modulo":
      return `🗑️ Removeu ${i.modulo_id}`;
    case "adicionar_topico":
      return `➕ Novo tópico “${i.titulo}”`;
    case "editar_topico":
      return `✏️ Editou ${i.topico_id}`;
    case "remover_topico":
      return `🗑️ Removeu ${i.topico_id}`;
    case "mover_topico":
      return `↕️ Moveu ${i.topico_id} → ${i.para_modulo_id}`;
    case "validar_ementa":
    case "validar_skill_cards":
    case "validar_aulas":
      return "✅ Rodou a validação";
    case "criar_skill_cards":
      return `🃏 Criou ${n(i.cards)} Card(s) de Conhecimento`;
    case "editar_skill_card":
      return `✏️ Editou ${i.card_id}`;
    case "remover_skill_cards":
      return `🗑️ Removeu ${(i.card_ids ?? []).join(", ")}`;
    case "dividir_skill_card":
      return `✂️ Dividiu ${i.card_id}`;
    case "mesclar_skill_cards":
      return `🔗 Fundiu ${(i.card_ids ?? []).join(" + ")}`;
    case "verificar_cobertura":
      return "🧩 Conferiu a cobertura da ementa";
    case "planejar_aulas":
      return `🗺️ Planejou ${n(i.aulas)} aula(s)`;
    case "escrever_aula":
      return `📝 Escreveu ${i.aula_id} (${n(i.blocos)} blocos)`;
    case "adicionar_aula":
      return `➕ Nova aula “${i.titulo}”`;
    case "editar_aula":
      return `✏️ Editou ${i.aula_id}`;
    case "remover_aula":
      return `🗑️ Removeu ${i.aula_id}`;
    case "mover_aula":
      return `↕️ Moveu ${i.aula_id}`;
    case "editar_bloco_texto":
    case "editar_quiz":
    case "substituir_bloco":
      return `✏️ Editou ${i.bloco_id}`;
    case "inserir_bloco":
      return `➕ Inseriu bloco em ${i.aula_id}`;
    case "remover_bloco":
      return `🗑️ Removeu ${i.bloco_id}`;
    case "reordenar_blocos":
      return `↕️ Reordenou ${i.aula_id}`;
    case "corrigir_aulas":
      return `🛠️ Aplicou ${n(i.correcoes)} correção(ões)`;
    default:
      return nome;
  }
}
