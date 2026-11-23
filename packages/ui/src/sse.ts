/**
 * Lê uma resposta Server-Sent Events (`data: {json}\n\n`) de um fetch e chama `onEvento` para cada
 * evento. Linhas de comentário (`: ping`) são ignoradas. Usado pelos streams de IA dos apps.
 */
export async function lerEventosSSE<T>(resp: Response, onEvento: (e: T) => void): Promise<void> {
  if (!resp.body) throw new Error("Resposta sem corpo.");
  const leitor = resp.body.getReader();
  const dec = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });
    const partes = buffer.split("\n\n");
    buffer = partes.pop() ?? "";
    for (const parte of partes) {
      const linha = parte.split("\n").find((l) => l.startsWith("data: "));
      if (linha) onEvento(JSON.parse(linha.slice(6)) as T);
    }
  }
}
