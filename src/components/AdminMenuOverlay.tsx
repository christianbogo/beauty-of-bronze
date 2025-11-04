import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { useOverlay } from "../providers/OverlayProvider";

export function AdminMenuOverlay() {
  const { isOpen, close } = useOverlay();
  return (
    <div
      className={
        "fixed inset-0 z-50 bg-neutral-900/95 px-6 py-4 backdrop-blur transition-opacity " +
        (isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")
      }
      aria-hidden={!isOpen}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between text-neutral-100">
        <div className="font-semibold">Admin</div>
        <button
          aria-label="Close menu"
          onClick={close}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-neutral-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="mx-auto mt-8 max-w-7xl">
        <ul className="space-y-4 text-2xl font-medium text-neutral-50 sm:text-3xl">
          <li>
            <Link to="/admin" onClick={close} className="hover:underline">
              Admin Home
            </Link>
          </li>
          <li>
            <Link to="/admin/gallery" onClick={close} className="hover:underline">
              Photo Manager
            </Link>
          </li>
          <li>
            <Link to="/admin/content/what-we-do" onClick={close} className="hover:underline">
              About BOB
            </Link>
          </li>
          <li>
            <Link onClick={close} to="/admin/content/events" className="hover:underline">
              Event Manager
            </Link>
          </li>
          <li>
            <Link to="/admin/content/testimonials" onClick={close} className="hover:underline">
              Testimonials
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}


