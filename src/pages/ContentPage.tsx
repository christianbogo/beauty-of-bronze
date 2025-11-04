import { useEffect, useMemo, useState } from "react";
import { fetchPageContent, type PageKey } from "../services/content";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/app";
import { Link, useLocation, useNavigate } from "react-router-dom";

export function ContentPage({ page, title }: { page: PageKey; title: string }) {
  const [summary, setSummary] = useState("");
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [featured, setFeatured] = useState<string[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string; title?: string; photoUrl?: string }[]>([]);
  const [supporters, setSupporters] = useState<{ id: string; name: string; subname?: string; photoUrl?: string }[]>([]);
  const [testimonialsItems, setTestimonialsItems] = useState<{
    id: string;
    paragraph: string;
    name: string;
    contact?: string;
    featured: string[];
  }[]>([]);
  const [events, setEvents] = useState<{
    id: string;
    title: string;
    date?: string;
    time?: string;
    location?: string;
    url?: string;
    archived?: boolean;
    paragraphs: string[];
    featured: string[];
  }[]>([]);
  const [groups, setGroups] = useState<{ id: string; title: string; cover?: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchPageContent(page).then((data) => {
      if (!mounted) return;
      setSummary(data?.summary ?? "");
      setParagraphs(data?.paragraphs ?? []);
      setFeatured((data?.featured ?? []).slice(0,3));
    });
    if (page === "events") {
      (async () => {
        const snap = await getDocs(query(collection(db, "events"), orderBy("date", "asc")));
        if (!mounted) return;
        setEvents(snap.docs.map((d) => ({ id: d.id, paragraphs: [], featured: [], ...(d.data() as any) })));
      })();
    }
    if (page === "gallery") {
      (async () => {
        const gsnap = await getDocs(query(collection(db, "galleryGroups"), orderBy("date", "desc")));
        const list: { id: string; title: string; cover?: string }[] = [];
        for (const d of gsnap.docs) {
          const data: any = d.data();
          let cover: string | undefined;
          const ps = await getDocs(collection(db, "galleryGroups", d.id, "photos"));
          ps.forEach((p) => {
            if (!cover) cover = (p.data() as any).url as string | undefined;
          });
          list.push({ id: d.id, title: data.title || "Untitled", cover });
        }
        if (!mounted) return;
        setGroups(list);
      })();
    }
    if (page === "who-we-are") {
      (async () => {
        const sSnap = await getDocs(query(collection(db, "staffMembers"), orderBy("order", "asc")));
        const cSnap = await getDocs(query(collection(db, "supporters"), orderBy("order", "asc")));
        if (!mounted) return;
        setStaff(sSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setSupporters(cSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      })();
    }
    if (page === "testimonials") {
      (async () => {
        const tsnap = await getDocs(query(collection(db, "testimonials"), orderBy("order", "asc")));
        if (!mounted) return;
        setTestimonialsItems(tsnap.docs.map((d) => ({ id: d.id, featured: [], ...(d.data() as any) })));
      })();
    }
    return () => {
      mounted = false;
    };
  }, [page]);

  const arranged = useMemo(() => {
    if (page !== "events") return [] as typeof events;
    const todayStr = new Date().toISOString().slice(0, 10);
    const withDate = events.filter((e) => typeof e.date === "string" && e.date);
    const past = withDate.filter((e) => (e.date as string) < todayStr).sort((a,b) => (b.date! as string).localeCompare(a.date! as string));
    const upcoming = withDate.filter((e) => (e.date as string) >= todayStr).sort((a,b) => (a.date! as string).localeCompare(b.date! as string));
    return [
      ...past.slice(0,1).map((e) => ({ ...e, isPast: true })),
      ...upcoming.map((e) => ({ ...e, isPast: false })),
    ];
  }, [events, page]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  // Sync selected event from query param
  useEffect(() => {
    if (page !== "events") return;
    const params = new URLSearchParams(location.search);
    const q = params.get("event");
    if (q) setSelectedEventId(q);
  }, [page, location.search]);
  useEffect(() => {
    if (page !== "events") return;
    if (!selectedEventId && arranged.length > 0) setSelectedEventId(arranged[0].id);
  }, [page, arranged, selectedEventId]);

  if (page === "events") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">{title}</h1>
        {summary && (
          <p className="mt-2 text-lg text-neutral-700 dark:text-neutral-300">{summary}</p>
        )}
        {featured.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((u) => (
              <img key={u} src={u} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
            ))}
          </div>
        )}
        {paragraphs.length > 0 && (
          <div className="mt-6 space-y-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-neutral-800 dark:text-neutral-200">{p}</p>
            ))}
          </div>
        )}
        {/* Minimal chronological list */}
        <div className="mt-6">
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {arranged.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEventId(e.id);
                    navigate(`?event=${encodeURIComponent(e.id)}`);
                  }}
                  className={(selectedEventId === e.id ? "bg-brand-50 dark:bg-neutral-900 " : "") + "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900"}
                >
                  <span className="truncate font-medium">{e.title || "Untitled"}</span>
                  <span className="shrink-0 text-sm text-neutral-600 dark:text-neutral-300">{e.date}{e.time ? ` • ${e.time}` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Selected event details below */}
        {selectedEventId && (
          <div className="mt-6 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
            {(() => {
              const ev = arranged.find((x) => x.id === selectedEventId);
              if (!ev) return null;
              return (
                <div className="space-y-3">
                  <div className="text-sm uppercase tracking-wide text-brand-700 dark:text-brand-300">{(ev as any).isPast ? "Past" : "Upcoming"}</div>
                  <h2 className="text-xl font-semibold">{ev.title || "Untitled"}</h2>
                  <div className="text-sm text-neutral-700 dark:text-neutral-300">{ev.date}{ev.time ? ` • ${ev.time}` : ""}{ev.location ? ` • ${ev.location}` : ""}</div>
                  {ev.featured && ev.featured.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {ev.featured.map((u) => (
                        <img key={u} src={u} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
                      ))}
                    </div>
                  )}
                  <div className="space-y-2 text-neutral-800 dark:text-neutral-200">
                    {(ev.paragraphs || []).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  if (page === "what-we-do") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{title}</h1>
          <Link to="/" className="text-brand-700 hover:underline">Back Home</Link>
        </div>
        {summary && (
          <p className="mt-2 text-xl text-neutral-700 dark:text-neutral-300">{summary}</p>
        )}
        {featured.length > 0 && (
          <WDCarousel urls={featured} />
        )}
        <div className="mt-6 space-y-4">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-neutral-800 dark:text-neutral-200">{p}</p>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/" className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900">Back Home</Link>
          <Link to="/who-we-are" className="rounded-md bg-brand-700 px-3 py-1.5 font-medium text-white hover:bg-brand-800">Read about Who We Are</Link>
        </div>
      </div>
    );
  }

  if (page === "who-we-are") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-bold">{title}</h1>
        {summary && (
          <p className="mt-2 text-xl text-neutral-700 dark:text-neutral-300">{summary}</p>
        )}
        {featured.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((u) => (
              <img key={u} src={u} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
            ))}
          </div>
        )}
        {paragraphs.length > 0 && (
          <div className="mt-6 space-y-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-neutral-800 dark:text-neutral-200">{p}</p>
            ))}
          </div>
        )}
        <h2 className="mt-8 text-xl font-semibold text-center">Staff</h2>
        <div className="mt-3 space-y-3">
          {staff.map((m) => (
            <div key={m.id} className="mx-auto flex max-w-md items-center gap-4 rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                {m.photoUrl && <img src={m.photoUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold">{m.name}</div>
                {m.title && <div className="truncate text-base text-neutral-600 dark:text-neutral-300">{m.title}</div>}
              </div>
            </div>
          ))}
        </div>
        <h2 className="mt-8 text-xl font-semibold text-center">Supporters & Sponsors</h2>
        <div className="mt-3 space-y-3">
          {supporters.map((s) => (
            <div key={s.id} className="mx-auto flex max-w-md items-center gap-4 rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                {s.photoUrl && <img src={s.photoUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold">{s.name}</div>
                {s.subname && <div className="truncate text-base text-neutral-600 dark:text-neutral-300">{s.subname}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (page === "testimonials") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-bold">{title}</h1>
        {summary && (
          <p className="mt-2 text-xl text-neutral-700 dark:text-neutral-300">{summary}</p>
        )}
        {featured.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((u) => (
              <img key={u} src={u} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
            ))}
          </div>
        )}
        {paragraphs.length > 0 && (
          <div className="mt-6 space-y-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-neutral-800 dark:text-neutral-200">{p}</p>
            ))}
          </div>
        )}

        <div className="mt-8 space-y-4">
          {testimonialsItems.map((t) => (
            <article key={t.id} className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
              <p className="text-neutral-800 dark:text-neutral-200">{t.paragraph}</p>
              <div className="mt-2 font-medium">— {t.name}{t.contact ? `, ${t.contact}` : ""}</div>
              {t.featured && t.featured.length > 0 && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {t.featured.map((u) => (
                    <img key={u} src={u} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">{title}</h1>
      {summary && (
        <p className="mt-2 text-xl text-neutral-700 dark:text-neutral-300">
          {summary}
        </p>
      )}
      {page === "gallery" && (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <button key={g.id} className="text-left" onClick={() => setSelectedGroup((prev) => (prev === g.id ? null : g.id))}>
                <div className="overflow-hidden rounded-md border border-neutral-200">
                  {g.cover ? (
                    <img src={g.cover} alt="" className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="aspect-[4/3] w-full bg-neutral-100" />
                  )}
                </div>
                <div className="mt-1 font-medium">{g.title}</div>
              </button>
            ))}
          </div>
          {selectedGroup && (
            <GalleryGroup id={selectedGroup} />
          )}
        </>
      )}
      <div className="mt-6 space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-neutral-800 dark:text-neutral-200">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}

function WDCarousel({ urls }: { urls: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (urls.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % urls.length), 5000);
    return () => clearInterval(id);
  }, [urls.length]);
  const current = urls[idx] ?? null;
  if (!current) return null;
  return (
    <div className="mx-auto mt-4 max-w-3xl">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-neutral-200">
        <img src={current} alt="" className="h-full w-full object-cover" />
      </div>
      {urls.length > 1 && (
        <div className="mt-2 flex justify-center gap-1">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={(i === idx ? "bg-brand-700" : "bg-brand-300") + " h-1.5 w-6 rounded-full"}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryGroup({ id }: { id: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const psnap = await getDocs(collection(db, "galleryGroups", id, "photos"));
      const list: string[] = [];
      psnap.forEach((d) => {
        const u = (d.data() as any).url as string | undefined;
        if (u) list.push(u);
      });
      if (!mounted) return;
      setUrls(list);
    })();
    return () => {
      mounted = false;
    };
  }, [id]);
  if (urls.length === 0) return null;
  return (
    <div className="mt-6">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {urls.map((u, i) => (
          <img key={i} src={u} alt="" className="w-full object-contain" />
        ))}
      </div>
    </div>
  );
}
