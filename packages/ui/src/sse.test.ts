import { describe, expect, it } from "vitest";
import { lerEventosSSE } from "./sse";

const respostaEmPedacos = (pedacos: string[]) =>
  new Response(
    new ReadableStream({
      start(c) {
        const enc = new TextEncoder();
        for (const p of pedacos) c.enqueue(enc.encode(p));
        c.close();
      },
    }),
  );

describe("lerEventosSSE", () => {
  it("junta eventos que chegam quebrados e ignora comentários", async () => {
    const eventos: { n: number }[] = [];
    await lerEventosSSE<{ n: number }>(respostaEmPedacos(['data: {"n":', '1}\n\n: ping\n\ndata: {"n":2}\n', "\n"]), (e) => eventos.push(e));
    expect(eventos).toEqual([{ n: 1 }, { n: 2 }]);
  });

  it("falha quando a resposta não tem corpo", async () => {
    await expect(lerEventosSSE(new Response(null), () => {})).rejects.toThrow("Resposta sem corpo.");
  });
});
