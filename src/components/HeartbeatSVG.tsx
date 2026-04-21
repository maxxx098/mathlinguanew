import { useEffect, useRef } from "react";

function HeartbeatSVG() {
  const polyRef = useRef<SVGPolylineElement>(null);
  const offRef = useRef(0);
  const rafRef = useRef<number>(0);

  // one full ECG cycle spanning 28px wide, baseline at y=18
  const basePts: [number, number][] = [
    [0, 18],
    [4, 18],
    [5, 15],
    [6, 24],
    [8, 4],   // sharp spike up
    [10, 22],
    [12, 18],
    [28, 18],
  ];

  useEffect(() => {
    function draw() {
      if (!polyRef.current) return;
      offRef.current = (offRef.current + 0.5) % 28;
      const off = offRef.current;

      // duplicate the pattern so the scroll is seamless
      const doubled: [number, number][] = [
        ...basePts,
        ...basePts.map(([x, y]) => [x + 28, y] as [number, number]),
      ];

      const shifted = doubled
        .map(([x, y]) => [x - off, y] as [number, number])
        .filter(([x]) => x >= -2 && x <= 30);

      polyRef.current.setAttribute(
        "points",
        shifted.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
      );

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <svg
      width="28"
      height="32"
      viewBox="0 0 28 32"
      fill="none"
      style={{ overflow: "visible" }}
    >
      <polyline
        ref={polyRef}
        stroke="rgba(248,113,113,0.75)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}