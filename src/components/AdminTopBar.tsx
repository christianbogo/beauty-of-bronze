import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { useOverlay } from "../providers/OverlayProvider";

export function AdminTopBar() {
  const { open } = useOverlay();
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-300 bg-neutral-200/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:h-16 sm:px-4">
        <button
          aria-label="Open admin menu"
          onClick={open}
          className="inline-flex h-9 items-center justify-center rounded-md px-2 hover:bg-neutral-300 active:bg-neutral-400"
        >
          <Menu className="h-5 w-5" />
          <span className="ml-2 hidden sm:inline">Menu</span>
        </button>
        <div />
        <Link
          to="/"
          className="inline-flex h-9 items-center justify-center rounded-md px-3 text-neutral-800 hover:bg-neutral-300 active:bg-neutral-400"
        >
          Back Home
        </Link>
      </div>
    </header>
  );
}


