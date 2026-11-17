import { useLayoutEffect, useRef, type ReactNode } from "react";

// Keep tools inside the visible workspace even near page edges or at high zoom.
export function PlacementTools({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = ref.current!;
    const position = () => {
      const anchor = node.parentElement!.getBoundingClientRect();
      const workspace = node.closest(".workspace")!.getBoundingClientRect();
      const left = Math.max(workspace.left + 8, 8);
      const right = Math.min(workspace.right, window.innerWidth) - 8;
      node.style.left = `${Math.max(left, Math.min(anchor.x + anchor.width / 2 - node.offsetWidth / 2, right - node.offsetWidth))}px`;
      const top = anchor.top - node.offsetHeight - 10;
      node.style.top = `${Math.max(workspace.top + 8, Math.min(top < workspace.top + 8 ? anchor.bottom + 10 : top, workspace.bottom - node.offsetHeight - 8))}px`;
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  });
  return <div ref={ref} className="placement-tools" role="group" aria-label="Selected signature tools"
    onPointerDown={(e) => e.stopPropagation()}>{children}</div>;
}
