import { useEffect, useState } from "react";
import { useAuth } from "../providers/AuthProvider";
import { Link } from "react-router-dom";
import {
  fetchPageContent,
  savePageContent,
  type PageKey,
} from "../services/content";

export function AdminPage() {
  const { user, isAdmin, signInWithGoogle, signOutUser } = useAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">
          Sign in with Google to continue.
        </p>
        <button
          className="mt-6 rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          onClick={signInWithGoogle}
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Access Denied</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">
          Your account is not authorized as an admin.
        </p>
        <div className="mt-6 flex gap-3">
          <Link to="/" className="underline">
            Go home
          </Link>
          <button onClick={signOutUser} className="underline">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <AdminEditor />;
}

function AdminEditor() {
  const [selectedPage, setSelectedPage] = useState<PageKey>("home");
  const [summary, setSummary] = useState("");
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [featured, setFeatured] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchPageContent(selectedPage)
      .then((data) => {
        if (!mounted) return;
        setSummary(data?.summary ?? "");
        setParagraphs(data?.paragraphs ?? []);
        setFeatured(data?.featured ?? []);
        setBanner(data?.banner ?? "");
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [selectedPage]);

  function addParagraph() {
    setParagraphs((prev) => [...prev, ""]);
  }
  function updateParagraph(idx: number, text: string) {
    setParagraphs((prev) => prev.map((p, i) => (i === idx ? text : p)));
  }
  function removeParagraph(idx: number) {
    setParagraphs((prev) => prev.filter((_, i) => i !== idx));
  }
  function moveParagraph(idx: number, delta: number) {
    setParagraphs((prev) => {
      const next = [...prev];
      const target = idx + delta;
      if (target < 0 || target >= next.length) return prev;
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next;
    });
  }
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  async function save() {
    setSaving(true);
    setSaveStatus("idle");
    const optimistic = {
      summary,
      paragraphs,
      featured: featured.slice(0, 3),
      banner,
    };
    try {
      await savePageContent(selectedPage, {
        summary: optimistic.summary,
        paragraphs: optimistic.paragraphs,
        featured: optimistic.featured,
        banner: selectedPage === "home" ? optimistic.banner : undefined,
      });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch (e) {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="mt-6 md:flex md:items-start md:gap-6">
        <aside className="md:w-60 md:shrink-0">
          <AdminNav value={selectedPage} onChange={setSelectedPage} />
        </aside>
        <div className="mt-6 flex-1 md:mt-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {labelForPage(selectedPage)}
            </h2>
          </div>

          <section className="mt-6">
        {loading && (
          <div className="mb-3 text-sm text-neutral-500">Loading…</div>
        )}
        <label className="block text-sm font-medium">Summary</label>
        <textarea
          className="mt-1 w-full rounded-md border border-neutral-300 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900"
          rows={2}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
          </section>

          <section className="mt-6">
        {selectedPage === "home" && (
          <div className="mb-6">
            <label className="block text-sm font-medium">
              Home Banner (optional)
            </label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900"
              placeholder="Banner text to show as an alert on home"
              value={banner}
              onChange={(e) => setBanner(e.target.value)}
            />
          </div>
        )}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Paragraphs</label>
          <button
            onClick={addParagraph}
            className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Add paragraph
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {paragraphs.map((text, i) => (
            <div key={i} className="flex items-start gap-2">
              <textarea
                className="w-full rounded-md border border-neutral-300 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900"
                rows={3}
                value={text}
                onChange={(e) => updateParagraph(i, e.target.value)}
              />
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  onClick={() => moveParagraph(i, -1)}
                  disabled={i === 0}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
                >
                  Up
                </button>
                <button
                  onClick={() => moveParagraph(i, 1)}
                  disabled={i === paragraphs.length - 1}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
                >
                  Down
                </button>
                <button
                  onClick={() => removeParagraph(i)}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
          </section>

          <section className="mt-6">
        <div className="mb-2 text-sm font-medium">Featured Photos (max 3)</div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          We will wire these to the gallery later. For now, paste photo IDs.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[0, 1, 2].map((i) => {
            const id = featured[i] ?? "";
            return (
              <input
                key={i}
                placeholder={`Photo ID ${i + 1}`}
                value={id}
                onChange={(e) => {
                  const next = [...featured];
                  next[i] = e.target.value;
                  setFeatured(next.filter(Boolean));
                }}
                className="rounded-md border border-neutral-300 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900"
              />
            );
          })}
        </div>
          </section>

          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {saveStatus === "success" && (
              <span className="text-sm text-green-600 dark:text-green-400">
                Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-sm text-red-600 dark:text-red-400">
                Save failed
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminNav({
  value,
  onChange,
}: {
  value: PageKey;
  onChange: (p: PageKey) => void;
}) {
  const pages: { key: PageKey; label: string }[] = [
    { key: "home", label: "Home" },
    { key: "what-we-do", label: "What We Do" },
    { key: "who-we-are", label: "Who We Are" },
    { key: "events", label: "Events" },
    { key: "supporters", label: "Supporters & Sponsors" },
    { key: "gallery", label: "Gallery" },
    { key: "testimonials", label: "Testimonials" },
  ];
  return (
    <nav className="rounded-md border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-950">
      <ul className="space-y-1">
        {pages.map((p) => {
          const active = p.key === value;
          return (
            <li key={p.key}>
              <button
                onClick={() => onChange(p.key)}
                className={
                  "w-full rounded-md px-3 py-2 text-left text-sm transition-colors " +
                  (active
                    ? "bg-brand-600/10 text-brand-800 ring-1 ring-brand-600/30 dark:text-brand-200"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-900")
                }
              >
                {p.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function labelForPage(p: PageKey): string {
  switch (p) {
    case "home":
      return "Home";
    case "what-we-do":
      return "What We Do";
    case "who-we-are":
      return "Who We Are";
    case "events":
      return "Events";
    case "supporters":
      return "Supporters & Sponsors";
    case "gallery":
      return "Gallery";
    case "testimonials":
      return "Testimonials";
    default:
      return "";
  }
}
