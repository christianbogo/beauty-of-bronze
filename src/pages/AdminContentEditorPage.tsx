import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import {
  fetchPageContent,
  savePageContent,
  type PageKey,
} from "../services/content";
import { AdminTopBar } from "../components/AdminTopBar";
import { AdminMenuOverlay } from "../components/AdminMenuOverlay";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase/app";

function isPageKey(v: string | undefined): v is PageKey {
  return (
    v === "what-we-do" ||
    v === "who-we-are" ||
    v === "events" ||
    v === "supporters" ||
    v === "gallery" ||
    v === "testimonials" ||
    v === "home"
  );
}

function TestimonialsManager({
  allPhotos,
}: {
  allPhotos: {
    url: string;
    key: string;
    name?: string;
    date?: string;
    caption?: string;
    groupId: string;
    groupTitle: string;
  }[];
}) {
  const [items, setItems] = useState<
    {
      id: string;
      paragraph: string;
      name: string;
      contact?: string;
      featured: string[];
      order?: number;
    }[]
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orig, setOrig] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, "testimonials"), orderBy("order", "asc"))
      );
      const list: any[] = [];
      snap.forEach((d) =>
        list.push({ id: d.id, featured: [], ...(d.data() as any) })
      );
      if (!mounted) return;
      setItems(list);
      setOrig(JSON.stringify(list));
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const dirty = JSON.stringify(items) !== orig;

  function addItem() {
    const id = crypto.randomUUID();
    setItems((prev) => [
      ...prev,
      { id, paragraph: "", name: "", contact: "", featured: [] },
    ]);
    setSelectedId(id);
  }

  async function saveAll() {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      items.forEach((t, i) => {
        batch.set(
          doc(db, "testimonials", t.id),
          {
            paragraph: t.paragraph,
            name: t.name,
            contact: t.contact ?? "",
            featured: t.featured.filter(Boolean),
            order: i,
          },
          { merge: true }
        );
      });
      await batch.commit();
      setOrig(JSON.stringify(items.map((t, i) => ({ ...t, order: i }))));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Testimonials</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={addItem}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-200"
          >
            Add testimonial
          </button>
          {dirty && (
            <>
              <button
                onClick={() => setItems(JSON.parse(orig))}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-200"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={saveAll}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
      </div>
      {loading && <div className="mt-2 text-sm text-neutral-500">Loading…</div>}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">
          {items.map((t, i) => (
            <div
              key={t.id}
              className={
                (selectedId === t.id ? "ring-2 ring-neutral-800 " : "") +
                "cursor-pointer rounded-md border border-neutral-300 bg-white p-3"
              }
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData("text/plain", String(i))
              }
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const from = Number(e.dataTransfer.getData("text/plain"));
                if (Number.isNaN(from)) return;
                const to = i;
                setItems((prev) => {
                  const next = [...prev];
                  const [it] = next.splice(from, 1);
                  next.splice(to, 0, it);
                  return next;
                });
              }}
              onClick={() =>
                setSelectedId((prev) => (prev === t.id ? null : t.id))
              }
            >
              <div className="font-medium truncate">{t.name || "Unnamed"}</div>
              <div className="text-xs text-neutral-600 line-clamp-2">
                {t.paragraph || "—"}
              </div>
            </div>
          ))}
        </div>
        <div className="md:col-span-2">
          {!selectedId && (
            <div className="rounded-md border border-neutral-300 bg-white p-4 text-sm text-neutral-500">
              Select a testimonial to edit.
            </div>
          )}
          {selectedId && (
            <div className="rounded-md border border-neutral-300 bg-white p-4">
              {(() => {
                const t = items.find((x) => x.id === selectedId)!;
                return (
                  <div className="space-y-3">
                    <input
                      className="w-full rounded-md border border-neutral-300 p-2"
                      placeholder="Name"
                      value={t.name}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === t.id ? { ...x, name: e.target.value } : x
                          )
                        )
                      }
                    />
                    <input
                      className="w-full rounded-md border border-neutral-300 p-2"
                      placeholder="Contact (optional)"
                      value={t.contact ?? ""}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === t.id
                              ? { ...x, contact: e.target.value }
                              : x
                          )
                        )
                      }
                    />
                    <textarea
                      className="w-full rounded-md border border-neutral-300 p-2"
                      rows={3}
                      placeholder="Testimonial paragraph"
                      value={t.paragraph}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === t.id
                              ? { ...x, paragraph: e.target.value }
                              : x
                          )
                        )
                      }
                    />
                    <FeaturedSlotsView
                      title="Featured Photos"
                      slots={t.featured}
                      setSlots={(s) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === t.id ? { ...x, featured: s } : x
                          )
                        )
                      }
                      allPhotos={allPhotos}
                    />
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
function SupportersManager({
  allPhotos,
}: {
  allPhotos: { url: string; key: string }[];
}) {
  const [items, setItems] = useState<
    {
      id: string;
      photoUrl?: string;
      name: string;
      subname?: string;
      description: string;
      order?: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPickerFor, setShowPickerFor] = useState<string | null>(null);
  const [orig, setOrig] = useState<string>("");
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, "supporters"), orderBy("order", "asc"))
      );
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      if (!mounted) return;
      setItems(list);
      setOrig(JSON.stringify(list));
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const dirty = JSON.stringify(items) !== orig;

  async function saveAll() {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      items.forEach((m, i) => {
        const ref = doc(db, "supporters", m.id || crypto.randomUUID());
        batch.set(
          ref,
          {
            photoUrl: m.photoUrl ?? "",
            name: m.name,
            subname: m.subname ?? "",
            description: m.description,
            order: i,
          },
          { merge: true }
        );
      });
      await batch.commit();
      for (const id of deleted) await deleteDoc(doc(db, "supporters", id));
      setOrig(JSON.stringify(items.map((m, i) => ({ ...m, order: i }))));
      setDeleted(new Set());
    } finally {
      setSaving(false);
    }
  }

  function addItem() {
    const id = crypto.randomUUID();
    setItems((prev) => [
      ...prev,
      { id, name: "", subname: "", description: "" },
    ]);
    setSelectedId(id);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((m) => m.id !== id));
    setDeleted((prev) => new Set(Array.from(prev).concat(id)));
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Supporters & Sponsors</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={addItem}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-200"
          >
            Add
          </button>
          {dirty && (
            <>
              <button
                onClick={() => setItems(JSON.parse(orig))}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-200"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={saveAll}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
      </div>
      {loading && <div className="mt-2 text-sm text-neutral-500">Loading…</div>}

      <div className="mt-3 space-y-2">
        {items.map((m, i) => (
          <div
            key={m.id}
            className={
              (selectedId === m.id ? "ring-2 ring-neutral-800 " : "") +
              "flex items-center gap-3 rounded-md border border-neutral-300 bg-white p-2"
            }
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const from = Number(e.dataTransfer.getData("text/plain"));
              if (Number.isNaN(from)) return;
              const to = i;
              setItems((prev) => {
                const next = [...prev];
                const [it] = next.splice(from, 1);
                next.splice(to, 0, it);
                return next;
              });
            }}
            onClick={() =>
              setSelectedId((prev) => (prev === m.id ? null : m.id))
            }
          >
            <div className="select-none cursor-move px-1 text-neutral-500">
              ≡
            </div>
            <div className="h-14 w-14 overflow-hidden rounded border border-neutral-300 bg-neutral-100">
              {m.photoUrl ? (
                <img
                  src={m.photoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-500">
                  No image
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{m.name || "Unnamed"}</div>
              {m.subname && (
                <div className="truncate text-xs text-neutral-600">
                  {m.subname}
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeItem(m.id);
              }}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-red-700 hover:bg-neutral-200"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {selectedId && (
        <div className="mt-4 rounded-md border border-neutral-300 bg-white p-3">
          {(() => {
            const m = items.find((x) => x.id === selectedId)!;
            return (
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setShowPickerFor(m.id)}
                  className="h-24 w-24 overflow-hidden rounded border border-neutral-300 bg-neutral-100"
                  title="Choose image"
                >
                  {m.photoUrl ? (
                    <img
                      src={m.photoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
                      Choose image
                    </span>
                  )}
                </button>
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <input
                    className="rounded-md border border-neutral-300 p-2"
                    placeholder="Name"
                    value={m.name}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x) =>
                          x.id === m.id ? { ...x, name: e.target.value } : x
                        )
                      )
                    }
                  />
                  <input
                    className="rounded-md border border-neutral-300 p-2"
                    placeholder="Subname (optional)"
                    value={m.subname ?? ""}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x) =>
                          x.id === m.id ? { ...x, subname: e.target.value } : x
                        )
                      )
                    }
                  />
                  <textarea
                    className="rounded-md border border-neutral-300 p-2 sm:col-span-2"
                    rows={3}
                    placeholder="Description"
                    value={m.description}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x) =>
                          x.id === m.id
                            ? { ...x, description: e.target.value }
                            : x
                        )
                      )
                    }
                  />
                </div>
              </div>
            );
          })()}
          {showPickerFor === selectedId && (
            <div className="mt-2 rounded-md border border-neutral-300 p-2">
              <div className="mb-1 text-xs text-neutral-600">
                Choose a photo
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {allPhotos.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setItems((prev) =>
                        prev.map((x) =>
                          x.id === selectedId ? { ...x, photoUrl: p.url } : x
                        )
                      );
                      setShowPickerFor(null);
                    }}
                    className="aspect-square overflow-hidden rounded border border-neutral-300"
                  >
                    <img
                      src={p.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
              <div className="mt-2 text-right">
                <button
                  onClick={() => setShowPickerFor(null)}
                  className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-200"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
// Top-level FeaturedSlotsView so other components (e.g., EventsManager) can use it
function FeaturedSlotsView({
  title,
  slots,
  setSlots,
  allPhotos,
}: {
  title: string;
  slots: string[];
  setSlots: (s: string[]) => void;
  allPhotos: {
    url: string;
    key: string;
    name?: string;
    date?: string;
    caption?: string;
    groupId: string;
    groupTitle: string;
  }[];
}) {
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);
  const groups = Array.from(
    allPhotos.reduce(
      (m, p) => m.set(p.groupId, p.groupTitle),
      new Map<string, string>()
    )
  );
  const [selectedGroup, setSelectedGroup] = useState<string | null>(
    groups[0]?.[0] ?? null
  );
  const photosForGroup = selectedGroup
    ? allPhotos.filter((p) => p.groupId === selectedGroup)
    : allPhotos;

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <button
          onClick={() => setSlots([...slots, ""])}
          className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-200"
        >
          Add slot
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {slots.map((url, i) => (
          <div
            key={i}
            className="flex items-center gap-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const from = Number(e.dataTransfer.getData("text/plain"));
              if (Number.isNaN(from)) return;
              const to = i;
              const next = [...slots];
              const [it] = next.splice(from, 1);
              next.splice(to, 0, it);
              setSlots(next);
            }}
          >
            <div
              className="select-none cursor-move px-2 py-2 text-neutral-500"
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData("text/plain", String(i))
              }
            >
              ≡
            </div>
            <button
              type="button"
              onClick={() => setPickerIdx((prev) => (prev === i ? null : i))}
              className="h-20 w-20 overflow-hidden rounded border border-neutral-300 bg-white"
              title="Select featured photo"
            >
              {url ? (
                <img src={url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
                  Choose
                </span>
              )}
            </button>
            <div className="flex-1 text-xs text-neutral-700">
              {(() => {
                const meta = allPhotos.find((p) => p.url === url);
                if (!meta) return null;
                return (
                  <div className="truncate">
                    <div className="font-medium truncate">
                      {meta.name || "Untitled"}
                    </div>
                    {meta.date && (
                      <div className="truncate text-neutral-500">
                        {meta.date}
                      </div>
                    )}
                    {meta.caption && (
                      <div className="truncate text-neutral-600">
                        {meta.caption}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <button
              onClick={() => setSlots(slots.filter((_, idx) => idx !== i))}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-200"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {pickerIdx !== null && (
        <div className="mt-3 rounded-md border border-neutral-300 p-2">
          <div className="mb-2 flex flex-wrap gap-2">
            {groups.map(([id, title]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedGroup(id)}
                className={
                  (selectedGroup === id
                    ? "bg-neutral-800 text-white "
                    : "bg-white ") +
                  "rounded-md border border-neutral-300 px-2 py-1 text-xs"
                }
              >
                {title}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {photosForGroup.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  const next = [...slots];
                  next[pickerIdx] = p.url;
                  setSlots(next);
                  setPickerIdx(null);
                }}
                className="aspect-square overflow-hidden rounded border border-neutral-300"
              >
                <img
                  src={p.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
          <div className="mt-2 text-right">
            <button
              onClick={() => setPickerIdx(null)}
              className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
export function AdminContentEditorPage() {
  const params = useParams();
  const pageParam = params.page;
  const page: PageKey | null = isPageKey(pageParam) ? pageParam : null;
  const { user, isAdmin, signInWithGoogle } = useAuth();

  const [summary, setSummary] = useState("");
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [featured, setFeatured] = useState<string[]>([]); // store photo URLs
  const [banner, setBanner] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  // Original snapshot for dirty checking and cancel
  const [orig, setOrig] = useState<{
    summary: string;
    paragraphs: string[];
    featured: string[];
    banner?: string;
  } | null>(null);

  // Secondary editor for Who We Are when editing what-we-do
  const [whoSummary, setWhoSummary] = useState("");
  const [whoParagraphs, setWhoParagraphs] = useState<string[]>([]);
  const [whoFeatured, setWhoFeatured] = useState<string[]>([]);
  const [whoOrig, setWhoOrig] = useState<{
    summary: string;
    paragraphs: string[];
    featured: string[];
  } | null>(null);

  // Global gallery photos for selectors
  const [allPhotos, setAllPhotos] = useState<
    {
      url: string;
      key: string;
      name?: string;
      date?: string;
      caption?: string;
      groupId: string;
      groupTitle: string;
    }[]
  >([]);

  useEffect(() => {
    if (!page) return;
    let mounted = true;
    setLoading(true);
    fetchPageContent(page)
      .then((data) => {
        if (!mounted) return;
        setSummary(data?.summary ?? "");
        setParagraphs(data?.paragraphs ?? []);
        setFeatured(data?.featured ?? []);
        setBanner(data?.banner ?? "");
        setOrig({
          summary: data?.summary ?? "",
          paragraphs: data?.paragraphs ?? [],
          featured: data?.featured ?? [],
          banner: data?.banner,
        });
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [page]);

  // Auto-expand all marked textareas on load and whenever content arrays change
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLTextAreaElement>(
        'textarea[data-auto-resize="1"]'
      )
    );
    els.forEach((el) => {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    });
  }, [summary, paragraphs, whoSummary, whoParagraphs]);

  // When editing what-we-do, also load who-we-are and global photos
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (page === "what-we-do") {
        const who = await fetchPageContent("who-we-are");
        if (mounted) {
          setWhoSummary(who?.summary ?? "");
          setWhoParagraphs(who?.paragraphs ?? []);
          setWhoFeatured(who?.featured ?? []);
          setWhoOrig({
            summary: who?.summary ?? "",
            paragraphs: who?.paragraphs ?? [],
            featured: who?.featured ?? [],
          });
        }
      }
      // Load all gallery photos
      const groupsSnap = await getDocs(
        query(collection(db, "galleryGroups"), orderBy("date", "desc"))
      );
      const urls: {
        url: string;
        key: string;
        name?: string;
        date?: string;
        caption?: string;
        groupId: string;
        groupTitle: string;
      }[] = [];
      for (const g of groupsSnap.docs) {
        const photosSnap = await getDocs(
          collection(db, "galleryGroups", g.id, "photos")
        );
        photosSnap.forEach((p) => {
          const data = p.data() as any;
          if (data?.url)
            urls.push({
              url: data.url as string,
              key: `${g.id}/${p.id}`,
              name: data.name,
              date: data.date,
              caption: data.caption,
              groupId: g.id,
              groupTitle: (g.data() as any)?.title ?? "Group",
            });
        });
      }
      if (mounted) setAllPhotos(urls);
    })();
    return () => {
      mounted = false;
    };
  }, [page]);

  async function save() {
    if (!page) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const cleanFeatured = featured.filter(
        (u) => typeof u === "string" && u.trim() !== ""
      );
      await savePageContent(page, {
        summary,
        paragraphs: paragraphs.filter((p) => p.trim() !== ""),
        featured: cleanFeatured,
        banner: page === "home" ? banner : undefined,
      });
      if (page === "what-we-do") {
        const cleanWhoFeatured = whoFeatured.filter(
          (u) => typeof u === "string" && u.trim() !== ""
        );
        await savePageContent("who-we-are", {
          summary: whoSummary,
          paragraphs: whoParagraphs.filter((p) => p.trim() !== ""),
          featured: cleanWhoFeatured,
          banner: undefined,
        });
      }
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch (e) {
      console.error("Save failed", e);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function saveWhat() {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const cleanFeatured = featured.filter(
        (u) => typeof u === "string" && u.trim() !== ""
      );
      await savePageContent("what-we-do", {
        summary,
        paragraphs: paragraphs.filter((p) => p.trim() !== ""),
        featured: cleanFeatured,
        banner: undefined,
      });
      setOrig({
        summary,
        paragraphs: paragraphs.filter((p) => p.trim() !== ""),
        featured: cleanFeatured,
        banner: orig?.banner,
      });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 1200);
    } catch (e) {
      console.error("Save WHAT failed", e);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function saveWho() {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const cleanWhoFeatured = whoFeatured.filter(
        (u) => typeof u === "string" && u.trim() !== ""
      );
      await savePageContent("who-we-are", {
        summary: whoSummary,
        paragraphs: whoParagraphs.filter((p) => p.trim() !== ""),
        featured: cleanWhoFeatured,
        banner: undefined,
      });
      setWhoOrig({
        summary: whoSummary,
        paragraphs: whoParagraphs.filter((p) => p.trim() !== ""),
        featured: cleanWhoFeatured,
      });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 1200);
    } catch (e) {
      console.error("Save WHO failed", e);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  // Top-level shared component for use outside the main editor (e.g., EventsManager)
  function FeaturedSlotsView({
    title,
    slots,
    setSlots,
    allPhotos,
  }: {
    title: string;
    slots: string[];
    setSlots: (s: string[]) => void;
    allPhotos: {
      url: string;
      key: string;
      name?: string;
      date?: string;
      caption?: string;
      groupId: string;
      groupTitle: string;
    }[];
  }) {
    const [pickerIdx, setPickerIdx] = useState<number | null>(null);
    const groups = Array.from(
      allPhotos.reduce(
        (m, p) => m.set(p.groupId, p.groupTitle),
        new Map<string, string>()
      )
    );
    const [selectedGroup, setSelectedGroup] = useState<string | null>(
      groups[0]?.[0] ?? null
    );
    const photosForGroup = selectedGroup
      ? allPhotos.filter((p) => p.groupId === selectedGroup)
      : allPhotos;

    return (
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{title}</div>
          <button
            onClick={() => setSlots([...slots, ""])}
            className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-200"
          >
            Add slot
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {slots.map((url, i) => (
            <div
              key={i}
              className="flex items-center gap-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const from = Number(e.dataTransfer.getData("text/plain"));
                if (Number.isNaN(from)) return;
                const to = i;
                const next = [...slots];
                const [it] = next.splice(from, 1);
                next.splice(to, 0, it);
                setSlots(next);
              }}
            >
              <div
                className="select-none cursor-move px-2 py-2 text-neutral-500"
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/plain", String(i))
                }
              >
                ≡
              </div>
              <button
                type="button"
                onClick={() => setPickerIdx((prev) => (prev === i ? null : i))}
                className="h-20 w-20 overflow-hidden rounded border border-neutral-300 bg-white"
                title="Select featured photo"
              >
                {url ? (
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
                    Choose
                  </span>
                )}
              </button>
              <div className="flex-1 text-xs text-neutral-700">
                {(() => {
                  const meta = allPhotos.find((p) => p.url === url);
                  if (!meta) return null;
                  return (
                    <div className="truncate">
                      <div className="font-medium truncate">
                        {meta.name || "Untitled"}
                      </div>
                      {meta.date && (
                        <div className="truncate text-neutral-500">
                          {meta.date}
                        </div>
                      )}
                      {meta.caption && (
                        <div className="truncate text-neutral-600">
                          {meta.caption}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <button
                onClick={() => setSlots(slots.filter((_, idx) => idx !== i))}
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-200"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        {pickerIdx !== null && (
          <div className="mt-3 rounded-md border border-neutral-300 p-2">
            <div className="mb-2 flex flex-wrap gap-2">
              {groups.map(([id, title]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedGroup(id)}
                  className={
                    (selectedGroup === id
                      ? "bg-neutral-800 text-white "
                      : "bg-white ") +
                    "rounded-md border border-neutral-300 px-2 py-1 text-xs"
                  }
                >
                  {title}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {photosForGroup.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    const next = [...slots];
                    next[pickerIdx] = p.url;
                    setSlots(next);
                    setPickerIdx(null);
                  }}
                  className="aspect-square overflow-hidden rounded border border-neutral-300"
                >
                  <img
                    src={p.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
            <div className="mt-2 text-right">
              <button
                onClick={() => setPickerIdx(null)}
                className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  const dirty = useMemo(() => {
    if (!orig) return false;
    const a = JSON.stringify({
      s: summary,
      p: paragraphs,
      f: featured,
      b: banner,
    });
    const b = JSON.stringify({
      s: orig.summary,
      p: orig.paragraphs,
      f: orig.featured,
      b: orig.banner,
    });
    const whoDirty =
      page === "what-we-do" && whoOrig
        ? JSON.stringify({
            s: whoSummary,
            p: whoParagraphs,
            f: whoFeatured,
          }) !==
          JSON.stringify({
            s: whoOrig.summary,
            p: whoOrig.paragraphs,
            f: whoOrig.featured,
          })
        : false;
    return a !== b || whoDirty;
  }, [
    summary,
    paragraphs,
    featured,
    banner,
    orig,
    page,
    whoSummary,
    whoParagraphs,
    whoFeatured,
    whoOrig,
  ]);

  const dirtyWhat = useMemo(() => {
    if (!orig) return false;
    return (
      JSON.stringify({ s: summary, p: paragraphs, f: featured }) !==
      JSON.stringify({ s: orig.summary, p: orig.paragraphs, f: orig.featured })
    );
  }, [summary, paragraphs, featured, orig]);

  const dirtyWho = useMemo(() => {
    if (page !== "what-we-do" || !whoOrig) return false;
    return (
      JSON.stringify({ s: whoSummary, p: whoParagraphs, f: whoFeatured }) !==
      JSON.stringify({
        s: whoOrig.summary,
        p: whoOrig.paragraphs,
        f: whoOrig.featured,
      })
    );
  }, [page, whoSummary, whoParagraphs, whoFeatured, whoOrig]);

  function cancelChanges() {
    if (!orig) return;
    setSummary(orig.summary);
    setParagraphs(orig.paragraphs);
    setFeatured(orig.featured);
    setBanner(orig.banner ?? "");
    if (page === "what-we-do" && whoOrig) {
      setWhoSummary(whoOrig.summary);
      setWhoParagraphs(whoOrig.paragraphs);
      setWhoFeatured(whoOrig.featured);
    }
  }

  function cancelWhat() {
    if (!orig) return;
    setSummary(orig.summary);
    setParagraphs(orig.paragraphs);
    setFeatured(orig.featured);
  }

  function cancelWho() {
    if (!whoOrig) return;
    setWhoSummary(whoOrig.summary);
    setWhoParagraphs(whoOrig.paragraphs);
    setWhoFeatured(whoOrig.featured);
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-neutral-600">
          Sign in with Google to continue.
        </p>
        <button
          className="mt-6 rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800"
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
        <p className="mt-2 text-neutral-600">
          Your account is not authorized as an admin.
        </p>
        <Link to="/" className="mt-6 inline-block underline">
          Go home
        </Link>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <Link to="/admin" className="mt-2 inline-block underline">
          Go to Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <AdminTopBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold">{labelForPage(page)}</h1>

        {page === "what-we-do" && (
          <h2 className="mt-6 text-xl font-semibold">What We Do</h2>
        )}
        <section className="mt-6">
          {loading && (
            <div className="mb-3 text-sm text-neutral-500">Loading…</div>
          )}
          <label className="block text-sm font-medium">Summary</label>
          <textarea
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white p-2"
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = el.scrollHeight + "px";
            }}
            data-auto-resize="1"
          />
        </section>

        {page === "home" && (
          <section className="mt-6">
            <label className="block text-sm font-medium">
              Home Banner (optional)
            </label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white p-2"
              placeholder="Banner text to show as an alert on home"
              value={banner}
              onChange={(e) => setBanner(e.target.value)}
            />
          </section>
        )}

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Paragraphs</label>
            <button
              onClick={() => setParagraphs((prev) => [...prev, ""])}
              className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-200"
            >
              Add paragraph
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {paragraphs.map((text, i) => (
              <div
                key={i}
                className="flex items-start gap-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const from = Number(e.dataTransfer.getData("text/plain"));
                  if (Number.isNaN(from)) return;
                  const to = i;
                  setParagraphs((prev) => {
                    const next = [...prev];
                    const [it] = next.splice(from, 1);
                    next.splice(to, 0, it);
                    return next;
                  });
                }}
              >
                <div
                  className="select-none cursor-move px-2 py-2 text-neutral-500"
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/plain", String(i))
                  }
                >
                  ≡
                </div>
                <textarea
                  className="w-full rounded-md border border-neutral-300 bg-white p-2"
                  rows={1}
                  value={text}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = el.scrollHeight + "px";
                  }}
                  onChange={(e) =>
                    setParagraphs((prev) =>
                      prev.map((p, idx) => (idx === i ? e.target.value : p))
                    )
                  }
                  style={{ overflow: "hidden", resize: "none" }}
                  data-auto-resize="1"
                  onDrop={(e) => e.preventDefault()}
                />
              </div>
            ))}
          </div>
        </section>

        <FeaturedSlotsView
          title="Featured Photos"
          slots={featured}
          setSlots={setFeatured}
          allPhotos={allPhotos}
        />

        {page === "what-we-do" && (
          <div className="mt-4 flex items-center gap-3">
            {dirtyWhat && (
              <>
                <button
                  onClick={cancelWhat}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveWhat}
                  disabled={saving}
                  className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
        )}

        {page === "events" && (
          <div className="mt-4 flex items-center gap-3">
            {dirty && (
              <>
                <button
                  onClick={cancelChanges}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-200"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
        )}

        {page === "testimonials" && (
          <div className="mt-4 flex items-center gap-3">
            {dirty && (
              <>
                <button
                  onClick={cancelChanges}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-200"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
        )}

        {page === "what-we-do" && (
          <>
            <h2 className="mt-10 text-xl font-semibold">Who We Are</h2>
            <section className="mt-4">
              <label className="block text-sm font-medium">Summary</label>
              <textarea
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white p-2"
                rows={2}
                value={whoSummary}
                onChange={(e) => setWhoSummary(e.target.value)}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = el.scrollHeight + "px";
                }}
                data-auto-resize="1"
              />
            </section>
            <section className="mt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Paragraphs</label>
                <button
                  onClick={() => setWhoParagraphs((prev) => [...prev, ""])}
                  className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-200"
                >
                  Add paragraph
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {whoParagraphs.map((text, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const from = Number(e.dataTransfer.getData("text/plain"));
                      if (Number.isNaN(from)) return;
                      const to = i;
                      setWhoParagraphs((prev) => {
                        const next = [...prev];
                        const [it] = next.splice(from, 1);
                        next.splice(to, 0, it);
                        return next;
                      });
                    }}
                  >
                    <div
                      className="select-none cursor-move px-2 py-2 text-neutral-500"
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", String(i))
                      }
                    >
                      ≡
                    </div>
                    <textarea
                      className="w-full rounded-md border border-neutral-300 bg-white p-2"
                      rows={1}
                      value={text}
                      onInput={(e) => {
                        const el = e.currentTarget;
                        el.style.height = "auto";
                        el.style.height = el.scrollHeight + "px";
                      }}
                      onChange={(e) =>
                        setWhoParagraphs((prev) =>
                          prev.map((p, idx) => (idx === i ? e.target.value : p))
                        )
                      }
                      style={{ overflow: "hidden", resize: "none" }}
                      data-auto-resize="1"
                      onDrop={(e) => e.preventDefault()}
                    />
                    <div className="flex shrink-0 flex-col gap-1" />
                  </div>
                ))}
              </div>
            </section>
            <FeaturedSlotsView
              title="Who We Are Featured Photos"
              slots={whoFeatured}
              setSlots={setWhoFeatured}
              allPhotos={allPhotos}
            />

            <StaffManager allPhotos={allPhotos} />
            <SupportersManager allPhotos={allPhotos} />
            <div className="mt-4 flex items-center gap-3">
              {dirtyWho && (
                <>
                  <button
                    onClick={cancelWho}
                    className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveWho}
                    disabled={saving}
                    className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {page === "events" && <EventsManager allPhotos={allPhotos} />}
        {page === "testimonials" && (
          <TestimonialsManager allPhotos={allPhotos} />
        )}
      </main>
      <AdminMenuOverlay />
    </div>
  );
}
function StaffManager({
  allPhotos,
}: {
  allPhotos: { url: string; key: string }[];
}) {
  const [members, setMembers] = useState<
    {
      id: string;
      photoUrl?: string;
      name: string;
      title: string;
      subtitle: string;
      bio: string;
      order?: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPickerFor, setShowPickerFor] = useState<string | null>(null);
  const [orig, setOrig] = useState<string>("");
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, "staffMembers"), orderBy("order", "asc"))
      );
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      if (!mounted) return;
      setMembers(list);
      setOrig(JSON.stringify(list));
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const dirty = JSON.stringify(members) !== orig;

  async function saveAll() {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      members.forEach((m, i) => {
        const ref = doc(db, "staffMembers", m.id || crypto.randomUUID());
        batch.set(
          ref,
          {
            photoUrl: m.photoUrl ?? "",
            name: m.name,
            title: m.title,
            subtitle: m.subtitle,
            bio: m.bio,
            order: i,
          },
          { merge: true }
        );
      });
      await batch.commit();
      // Delete removed docs
      for (const id of deleted) {
        await deleteDoc(doc(db, "staffMembers", id));
      }
      setOrig(JSON.stringify(members.map((m, i) => ({ ...m, order: i }))));
      setDeleted(new Set());
    } finally {
      setSaving(false);
    }
  }

  function addMember() {
    setMembers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        title: "",
        subtitle: "",
        bio: "",
      },
    ]);
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setDeleted((prev) => new Set(Array.from(prev).concat(id)));
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Staff Members</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={addMember}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-200"
          >
            Add member
          </button>
          {dirty && (
            <>
              <button
                onClick={() => setMembers(JSON.parse(orig))}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-200"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={saveAll}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
      </div>
      {loading && <div className="mt-2 text-sm text-neutral-500">Loading…</div>}

      {/* Cards list with drag-and-drop sorting */}
      <div className="mt-3 space-y-2">
        {members.map((m, i) => (
          <div
            key={m.id}
            className={
              (selectedId === m.id ? "ring-2 ring-neutral-800 " : "") +
              "flex items-center gap-3 rounded-md border border-neutral-300 bg-white p-2"
            }
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const from = Number(e.dataTransfer.getData("text/plain"));
              if (Number.isNaN(from)) return;
              const to = i;
              setMembers((prev) => {
                const next = [...prev];
                const [it] = next.splice(from, 1);
                next.splice(to, 0, it);
                return next;
              });
            }}
            onClick={() =>
              setSelectedId((prev) => (prev === m.id ? null : m.id))
            }
          >
            <div className="select-none cursor-move px-1 text-neutral-500">
              ≡
            </div>
            <div className="h-14 w-14 overflow-hidden rounded border border-neutral-300 bg-neutral-100">
              {m.photoUrl ? (
                <img
                  src={m.photoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-500">
                  No photo
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{m.name || "Unnamed"}</div>
              <div className="truncate text-xs text-neutral-600">{m.title}</div>
              <div className="truncate text-xs text-neutral-500">
                {m.subtitle}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeMember(m.id);
              }}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-red-700 hover:bg-neutral-200"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Detail editor for selected member */}
      {selectedId && (
        <div className="mt-4 rounded-md border border-neutral-300 bg-white p-3">
          {(() => {
            const m = members.find((x) => x.id === selectedId)!;
            return (
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setShowPickerFor(m.id)}
                  className="h-24 w-24 overflow-hidden rounded border border-neutral-300 bg-neutral-100"
                  title="Choose profile photo"
                >
                  {m.photoUrl ? (
                    <img
                      src={m.photoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
                      Choose photo
                    </span>
                  )}
                </button>
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <input
                    className="rounded-md border border-neutral-300 p-2"
                    placeholder="Name"
                    value={m.name}
                    onChange={(e) =>
                      setMembers((prev) =>
                        prev.map((x) =>
                          x.id === m.id ? { ...x, name: e.target.value } : x
                        )
                      )
                    }
                  />
                  <input
                    className="rounded-md border border-neutral-300 p-2"
                    placeholder="Title"
                    value={m.title}
                    onChange={(e) =>
                      setMembers((prev) =>
                        prev.map((x) =>
                          x.id === m.id ? { ...x, title: e.target.value } : x
                        )
                      )
                    }
                  />
                  <input
                    className="rounded-md border border-neutral-300 p-2"
                    placeholder="Subtitle (tenure)"
                    value={m.subtitle}
                    onChange={(e) =>
                      setMembers((prev) =>
                        prev.map((x) =>
                          x.id === m.id ? { ...x, subtitle: e.target.value } : x
                        )
                      )
                    }
                  />
                  <textarea
                    className="rounded-md border border-neutral-300 p-2 sm:col-span-2"
                    rows={3}
                    placeholder="Bio"
                    value={m.bio}
                    onChange={(e) =>
                      setMembers((prev) =>
                        prev.map((x) =>
                          x.id === m.id ? { ...x, bio: e.target.value } : x
                        )
                      )
                    }
                  />
                </div>
              </div>
            );
          })()}
          {showPickerFor === selectedId && (
            <div className="mt-2 rounded-md border border-neutral-300 p-2">
              <div className="mb-1 text-xs text-neutral-600">
                Choose a photo
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {allPhotos.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setMembers((prev) =>
                        prev.map((x) =>
                          x.id === selectedId ? { ...x, photoUrl: p.url } : x
                        )
                      );
                      setShowPickerFor(null);
                    }}
                    className="aspect-square overflow-hidden rounded border border-neutral-300"
                  >
                    <img
                      src={p.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
              <div className="mt-2 text-right">
                <button
                  onClick={() => setShowPickerFor(null)}
                  className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-200"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function EventsManager({
  allPhotos,
}: {
  allPhotos: {
    url: string;
    key: string;
    name?: string;
    date?: string;
    caption?: string;
    groupId: string;
    groupTitle: string;
  }[];
}) {
  const [events, setEvents] = useState<
    {
      id: string;
      title: string;
      date?: string;
      time?: string;
      location?: string;
      url?: string;
      archived?: boolean;
      summary?: string;
      paragraphs: string[];
      featured: string[];
    }[]
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orig, setOrig] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, "events"), orderBy("date", "desc"))
      );
      const list: any[] = [];
      snap.forEach((d) =>
        list.push({
          id: d.id,
          paragraphs: [],
          featured: [],
          ...(d.data() as any),
        })
      );
      if (!mounted) return;
      setEvents(list);
      setOrig(JSON.stringify(list));
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const dirty = JSON.stringify(events) !== orig;

  function addEvent() {
    const id = crypto.randomUUID();
    setEvents((prev) => [
      {
        id,
        title: "New Event",
        date: new Date().toISOString().slice(0, 10),
        time: "",
        location: "",
        url: "",
        archived: false,
        paragraphs: [],
        featured: [],
      },
      ...prev,
    ]);
    setSelectedId(id);
  }

  async function saveAll() {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      events.forEach((e, i) => {
        const ref = doc(db, "events", e.id);
        batch.set(
          ref,
          {
            title: e.title,
            date: e.date ?? "",
            time: e.time ?? "",
            location: e.location ?? "",
            url: e.url ?? "",
            archived: !!e.archived,
            summary: e.summary ?? "",
            paragraphs: e.paragraphs.filter((p) => p.trim() !== ""),
            featured: e.featured.filter(Boolean),
            order: i,
          },
          { merge: true }
        );
      });
      await batch.commit();
      setOrig(JSON.stringify(events));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Event Manager</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={addEvent}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-200"
          >
            Add event
          </button>
          {dirty && (
            <>
              <button
                onClick={() => setEvents(JSON.parse(orig))}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-200"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={saveAll}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
      </div>
      {loading && <div className="mt-2 text-sm text-neutral-500">Loading…</div>}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">
          {[...events]
            .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
            .map((e) => (
              <div
                key={e.id}
                className={
                  (selectedId === e.id ? "ring-2 ring-neutral-800 " : "") +
                  "cursor-pointer rounded-md border border-neutral-300 bg-white p-3"
                }
                onClick={() =>
                  setSelectedId((prev) => (prev === e.id ? null : e.id))
                }
              >
                <div className="font-medium">{e.title || "Untitled"}</div>
                <div className="text-xs text-neutral-600">
                  {e.date} {e.time}
                </div>
                <div className="text-xs text-neutral-500">{e.location}</div>
                {e.archived && (
                  <div className="mt-1 inline-block rounded bg-neutral-200 px-1.5 py-0.5 text-[10px]">
                    Archived
                  </div>
                )}
              </div>
            ))}
        </div>
        <div className="md:col-span-2">
          {!selectedId && (
            <div className="rounded-md border border-neutral-300 bg-white p-4 text-sm text-neutral-500">
              Select an event to edit.
            </div>
          )}
          {selectedId && (
            <div className="rounded-md border border-neutral-300 bg-white p-4">
              {(() => {
                const idx = events.findIndex((x) => x.id === selectedId);
                const ev = events[idx];
                return (
                  <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        className="rounded-md border border-neutral-300 p-2"
                        placeholder="Title"
                        value={ev.title}
                        onChange={(e) =>
                          setEvents((prev) =>
                            prev.map((x) =>
                              x.id === selectedId
                                ? { ...x, title: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                      <input
                        className="rounded-md border border-neutral-300 p-2"
                        type="date"
                        placeholder="Date"
                        value={ev.date ?? ""}
                        onChange={(e) =>
                          setEvents((prev) =>
                            prev.map((x) =>
                              x.id === selectedId
                                ? { ...x, date: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                      <input
                        className="rounded-md border border-neutral-300 p-2"
                        placeholder="Time"
                        value={ev.time ?? ""}
                        onChange={(e) =>
                          setEvents((prev) =>
                            prev.map((x) =>
                              x.id === selectedId
                                ? { ...x, time: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                      <input
                        className="rounded-md border border-neutral-300 p-2"
                        placeholder="Location"
                        value={ev.location ?? ""}
                        onChange={(e) =>
                          setEvents((prev) =>
                            prev.map((x) =>
                              x.id === selectedId
                                ? { ...x, location: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                      <input
                        className="rounded-md border border-neutral-300 p-2 sm:col-span-2"
                        placeholder="External URL (optional)"
                        value={ev.url ?? ""}
                        onChange={(e) =>
                          setEvents((prev) =>
                            prev.map((x) =>
                              x.id === selectedId
                                ? { ...x, url: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!ev.archived}
                          onChange={(e) =>
                            setEvents((prev) =>
                              prev.map((x) =>
                                x.id === selectedId
                                  ? { ...x, archived: e.target.checked }
                                  : x
                              )
                            )
                          }
                        />
                        Archived
                      </label>
                    </div>

                    <div>
                      <div className="mb-1 text-sm font-medium">Summary</div>
                      <textarea
                        className="w-full rounded-md border border-neutral-300 p-2"
                        rows={2}
                        value={(ev as any).summary ?? ""}
                        onInput={(e) => {
                          const el = e.currentTarget;
                          el.style.height = "auto";
                          el.style.height = el.scrollHeight + "px";
                        }}
                        onChange={(e) =>
                          setEvents((prev) =>
                            prev.map((x) =>
                              x.id === selectedId
                                ? { ...x, summary: e.target.value }
                                : x
                            )
                          )
                        }
                        style={{ overflow: "hidden", resize: "none" }}
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-sm font-medium">Paragraphs</div>
                      <div className="space-y-2">
                        {ev.paragraphs.map((p, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              const from = Number(
                                e.dataTransfer.getData("text/plain")
                              );
                              if (Number.isNaN(from)) return;
                              const to = i;
                              setEvents((prev) =>
                                prev.map((x) => {
                                  if (x.id !== selectedId) return x;
                                  const nextP = [...x.paragraphs];
                                  const [it] = nextP.splice(from, 1);
                                  nextP.splice(to, 0, it);
                                  return { ...x, paragraphs: nextP };
                                })
                              );
                            }}
                          >
                            <div
                              className="select-none cursor-move px-2 py-2 text-neutral-500"
                              draggable
                              onDragStart={(e) =>
                                e.dataTransfer.setData("text/plain", String(i))
                              }
                            >
                              ≡
                            </div>
                            <textarea
                              className="w-full rounded-md border border-neutral-300 p-2"
                              rows={1}
                              value={p}
                              onInput={(e) => {
                                const el = e.currentTarget;
                                el.style.height = "auto";
                                el.style.height = el.scrollHeight + "px";
                              }}
                              onChange={(e) =>
                                setEvents((prev) =>
                                  prev.map((x) =>
                                    x.id === selectedId
                                      ? {
                                          ...x,
                                          paragraphs: x.paragraphs.map(
                                            (pp, idx) =>
                                              idx === i ? e.target.value : pp
                                          ),
                                        }
                                      : x
                                  )
                                )
                              }
                              style={{ overflow: "hidden", resize: "none" }}
                              onDrop={(e) => e.preventDefault()}
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() =>
                          setEvents((prev) =>
                            prev.map((x) =>
                              x.id === selectedId
                                ? { ...x, paragraphs: [...x.paragraphs, ""] }
                                : x
                            )
                          )
                        }
                        className="mt-2 rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-200"
                      >
                        Add paragraph
                      </button>
                    </div>

                    <FeaturedSlotsView
                      title="Featured Photos"
                      slots={ev.featured}
                      setSlots={(s) =>
                        setEvents((prev) =>
                          prev.map((x) =>
                            x.id === selectedId ? { ...x, featured: s } : x
                          )
                        )
                      }
                      allPhotos={allPhotos}
                    />
                    {dirty && (
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => setEvents(JSON.parse(orig))}
                          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-200"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={saving}
                          onClick={saveAll}
                          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function labelForPage(p: PageKey): string {
  switch (p) {
    case "home":
      return "Home";
    case "what-we-do":
      return "About BOB";
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
