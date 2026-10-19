import { cn } from "@/lib/utils";

type Props = {
  state: string;
  onTile?: ((index: number) => void) | undefined;
  highlight?: number | null | undefined;
  size?: "sm" | "md" | "lg";
  solved?: boolean | undefined;
  label?: string;
};

/** 3×3 board. Tiles are absolutely positioned so moves animate smoothly. */
export function Board({ state, onTile, highlight, size = "lg", solved, label = "Puzzle board" }: Props) {
  const dim = size === "lg" ? "w-[min(84vw,360px)]" : size === "md" ? "w-56" : "w-24";
  const text = size === "lg" ? "text-4xl" : size === "md" ? "text-2xl" : "text-sm";
  const tiles = "12345678".split("");
  return (
    <div
      role="grid"
      aria-label={label}
      className={cn("relative aspect-square rounded-2xl bg-slot p-[3%] ring-1 ring-border", dim, solved && "ring-2 ring-success")}
    >
      {tiles.map((t) => {
        const i = state.indexOf(t);
        const r = Math.floor(i / 3), c = i % 3;
        const Tag = onTile ? "button" : "div";
        return (
          <Tag
            key={t}
            {...(onTile ? { type: "button" as const, onClick: () => onTile(i), "aria-label": `Tile ${t}, row ${r + 1}, column ${c + 1}` } : {})}
            className={cn(
              "tile absolute flex items-center justify-center font-mono font-bold transition-all duration-200 ease-out",
              size === "sm" ? "rounded-md" : "rounded-xl",
              text,
              onTile && "cursor-pointer hover:brightness-105 focus-visible:outline-2 focus-visible:outline-ring",
              highlight === i && "ring-4 ring-accent",
            )}
            style={{
              width: "31%", height: "31%",
              left: `${3 + c * 32}%`, top: `${3 + r * 32}%`,
            }}
          >
            {t}
          </Tag>
        );
      })}
    </div>
  );
}
