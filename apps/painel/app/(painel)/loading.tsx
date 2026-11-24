import { Esqueleto } from "@edu/ui";

export default function Carregando() {
  return (
    <div className="space-y-5 px-8 pt-7">
      <Esqueleto className="h-9 w-72 rounded-xl" />
      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Esqueleto key={i} className="h-28 rounded-card" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Esqueleto className="h-72 rounded-card" />
        <Esqueleto className="h-72 rounded-card" />
      </div>
    </div>
  );
}
