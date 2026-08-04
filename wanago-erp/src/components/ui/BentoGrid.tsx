type Props = {
  main: React.ReactNode;
  side: [React.ReactNode, React.ReactNode];
};

// Asymmetric 1-large + 2-stacked-small arrangement — the layout StatCard's
// plain `grid-cols-2` doesn't provide. Callers pass StatCard (or anything
// else) into the slots; this only owns the grid, not the tile rendering.
export function BentoGrid({ main, side }: Props) {
  return (
    <div className="grid grid-cols-[1.3fr_1fr] gap-3">
      {main}
      <div className="flex flex-col gap-3">
        {side[0]}
        {side[1]}
      </div>
    </div>
  );
}
