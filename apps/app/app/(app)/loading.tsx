import { Esqueleto } from "@edu/ui";

export default function Carregando() {
  return (
    <main className="space-y-4 px-5 pt-7">
      <Esqueleto className="h-8 w-48 rounded-xl" />
      <div className="grid grid-cols-3 gap-2.5">
        <Esqueleto className="h-14 rounded-card" />
        <Esqueleto className="h-14 rounded-card" />
        <Esqueleto className="h-14 rounded-card" />
      </div>
      <Esqueleto className="h-40 rounded-[24px]" />
      <Esqueleto className="h-20 rounded-card" />
      <Esqueleto className="h-20 rounded-card" />
    </main>
  );
}
