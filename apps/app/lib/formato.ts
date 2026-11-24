export function saudacao(timeZone = process.env.APP_TIMEZONE || "America/Sao_Paulo") {
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export function primeiroNome(nome: string) {
  return nome.split(" ")[0];
}

export const numero = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
