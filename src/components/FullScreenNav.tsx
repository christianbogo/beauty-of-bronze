import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { useOverlay } from "../providers/OverlayProvider";
import { useTheme } from "../providers/ThemeProvider";
import { useI18n } from "../providers/I18nProvider";

export function FullScreenNav() {
  const { isOpen, close } = useOverlay();
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  return (
    <div
      className={
        "fixed inset-0 z-50 bg-white/95 px-6 py-4 backdrop-blur transition-opacity dark:bg-neutral-950/95 " +
        (isOpen
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0")
      }
      aria-hidden={!isOpen}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="font-semibold">Beauty of Bronze</div>
        <button
          aria-label="Close menu"
          onClick={close}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="mx-auto mt-8 max-w-7xl">
        <ul className="space-y-4 text-2xl font-medium sm:text-3xl">
          <li>
            <Link onClick={close} to="/" className="hover:underline">
              Home
            </Link>
          </li>
          <li>
            <Link onClick={close} to="/what-we-do" className="hover:underline">
              What We Do
            </Link>
          </li>
          <li>
            <Link onClick={close} to="/events" className="hover:underline">
              Events
            </Link>
          </li>
          <li>
            <Link onClick={close} to="/who-we-are" className="hover:underline">
              Who We Are
            </Link>
          </li>
          <li>
            <Link onClick={close} to="/gallery" className="hover:underline">
              Gallery
            </Link>
          </li>
          <li>
            <Link
              onClick={close}
              to="/testimonials"
              className="hover:underline"
            >
              Testimonials
            </Link>
          </li>
        </ul>
      </nav>

      <div className="mx-auto mt-10 max-w-7xl border-t border-neutral-200 pt-6 text-sm dark:border-neutral-800">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-2 font-medium">{t("theme")}</div>
            <div className="flex gap-2">
              {(["light", "dark", "system"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setTheme(opt)}
                  className={
                    "rounded-md border px-3 py-1 " +
                    (theme === opt
                      ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                      : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900")
                  }
                >
                  {t(opt as any)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

