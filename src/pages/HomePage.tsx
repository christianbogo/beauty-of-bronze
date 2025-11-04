import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../providers/I18nProvider";
import { fetchPageContent } from "../services/content";
import logoFull from "../assets/Logo/Full Color/Beauty of Bronze Logo.png";
import logoWhite from "../assets/Logo/One-Color/Beauty of Bronze Logo_white.png";
import { useOverlay } from "../providers/OverlayProvider";
import { Menu, Heart } from "lucide-react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/app";

export function HomePage() {
  const { t } = useI18n();
  const { open } = useOverlay();
  const [banner, setBanner] = useState("");
  const [hideBanner, setHideBanner] = useState(false);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [whatWeDoFeatured, setWhatWeDoFeatured] = useState<string[]>([]);
  const [events, setEvents] = useState<
    {
      id: string;
      title: string;
      date?: string;
      time?: string;
      location?: string;
      paragraphs?: string[];
      featured?: string[];
    }[]
  >([]);
  const [staff, setStaff] = useState<
    { id: string; name: string; photoUrl?: string; title?: string }[]
  >([]);
  const [supporters, setSupporters] = useState<
    { id: string; name: string; photoUrl?: string; subname?: string }[]
  >([]);
  const [galleryPool, setGalleryPool] = useState<string[]>([]);
  const [galleryCycle, setGalleryCycle] = useState<string[]>([]);
  const [testimonials, setTestimonials] = useState<
    { id: string; paragraph: string; name: string }[]
  >([]);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  // Fullscreen viewer removed per request

  useEffect(() => {
    let mounted = true;
    // Fetch home for banner
    fetchPageContent("home").then((data) => {
      if (!mounted) return;
      setBanner(data?.banner ?? "");
    });
    // Fetch summaries for sections
    Promise.all([
      fetchPageContent("what-we-do"),
      fetchPageContent("who-we-are"),
      fetchPageContent("events"),
      fetchPageContent("supporters"),
      fetchPageContent("gallery"),
      fetchPageContent("testimonials"),
    ]).then(([w, who, ev, sup, gal, tes]) => {
      if (!mounted) return;
      setSummaries({
        "what-we-do": w?.summary ?? "",
        "who-we-are": who?.summary ?? "",
        events: ev?.summary ?? "",
        supporters: sup?.summary ?? "",
        gallery: gal?.summary ?? "",
        testimonials: tes?.summary ?? "",
      });
      setWhatWeDoFeatured(w?.featured ?? []);
    });
    // Fetch events
    (async () => {
      const snap = await getDocs(
        query(collection(db, "events"), orderBy("date", "asc"))
      );
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      if (!mounted) return;
      setEvents(list);
    })();
    // Fetch staff
    (async () => {
      const snap = await getDocs(
        query(collection(db, "staffMembers"), orderBy("order", "asc"))
      );
      if (!mounted) return;
      setStaff(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    })();
    // Fetch supporters
    (async () => {
      const snap = await getDocs(
        query(collection(db, "supporters"), orderBy("order", "asc"))
      );
      if (!mounted) return;
      setSupporters(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    })();
    // Fetch gallery photos pool
    (async () => {
      const gsnap = await getDocs(
        query(collection(db, "galleryGroups"), orderBy("date", "desc"))
      );
      const groupIds = gsnap.docs.map((d) => d.id);
      const all: string[] = [];
      for (const gid of groupIds) {
        const psnap = await getDocs(
          collection(db, "galleryGroups", gid, "photos")
        );
        psnap.forEach((p) => {
          const u = (p.data() as any).url as string | undefined;
          if (u) all.push(u);
        });
      }
      if (!mounted) return;
      setGalleryPool(all);
      setGalleryCycle(pickRandom(all, 3));
    })();
    // Fetch testimonials
    (async () => {
      const tsnap = await getDocs(
        query(collection(db, "testimonials"), orderBy("order", "asc"))
      );
      if (!mounted) return;
      setTestimonials(
        tsnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      );
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // cycle gallery images every 6s
  useEffect(() => {
    if (galleryPool.length < 3) return;
    const id = setInterval(() => {
      setGalleryCycle(() => pickRandom(galleryPool, 3));
    }, 6000);
    return () => clearInterval(id);
  }, [galleryPool]);

  const eventDisplay = useMemo(() => arrangeEvents(events), [events]);
  return (
    <div className="mx-auto max-w-none px-0 pt-0 sm:pt-0">
      {/* Hero: centered full logo over the site background gradient */}
      <section className="relative isolate block w-full">
        {/* Inline top-of-hero nav, sits on page background */}
        <div className="absolute inset-x-0 top-0">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:h-16 sm:px-4">
            <button
              aria-label={t("openMenu")}
              onClick={open}
              className="inline-flex h-9 items-center justify-center rounded-md px-2 hover:bg-neutral-100/60 active:bg-neutral-200/60 dark:hover:bg-neutral-900/60 dark:active:bg-neutral-800/60"
            >
              <Menu className="h-5 w-5" />
              <span className="ml-2 hidden sm:inline">Menu</span>
            </button>
            <div />
            <a
              href="https://givebutter.com/beautyofbronze"
              target="_blank"
              rel="noreferrer"
              aria-label={t("donate")}
              className="inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-brand-700 hover:bg-brand-50/70 active:bg-brand-100/70 dark:text-brand-300 dark:hover:bg-neutral-900/60"
            >
              <Heart className="h-5 w-5" />
              <span className="ml-2 hidden sm:inline">{t("donate")}</span>
            </a>
          </div>
        </div>
        <div className="mx-auto flex h-[48vh] min-h-[280px] max-w-7xl flex-col items-center justify-center px-4 text-center sm:h-[56vh]">
          <img
            src={logoFull}
            alt="Beauty of Bronze"
            className="block w-[86%] max-w-[900px] h-auto drop-shadow-sm dark:hidden"
          />
          <img
            src={logoWhite}
            alt="Beauty of Bronze"
            className="hidden w-[86%] max-w-[900px] h-auto drop-shadow-sm dark:block"
          />
          <p className="mt-5 max-w-4xl text-xl font-semibold leading-snug text-neutral-800 dark:text-neutral-100 sm:text-2xl">
            Bringing art to all students in the Pacific Northwest, regardless of
            income.
          </p>
        </div>
      </section>
      {banner && !hideBanner && (
        <div className="fixed inset-x-0 top-20 z-50 px-4 sm:top-24">
          <div className="mx-auto max-w-7xl rounded-md border border-brand-300 bg-brand-50/95 px-4 py-3 text-brand-900 shadow backdrop-blur dark:border-brand-700 dark:bg-brand-500/15 dark:text-brand-100">
            <div className="flex items-start justify-between gap-4">
              <div className="text-sm sm:text-base">{banner}</div>
              <button
                className="rounded-md border border-brand-300 px-2 py-0.5 text-sm hover:bg-brand-100 dark:border-brand-700 dark:hover:bg-brand-400/10"
                onClick={() => setHideBanner(true)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stacked new sections */}
      <WhatWeDoSection
        summary={summaries["what-we-do"]}
        images={whatWeDoFeatured}
      />
      <EventsSection events={eventDisplay} />
      <WhoWeAreSection
        summary={summaries["who-we-are"]}
        staff={staff}
        supporters={supporters}
      />
      <GallerySection urls={galleryCycle} />
      <TestimonialsSection
        items={testimonials}
        idx={testimonialIdx}
        setIdx={setTestimonialIdx}
      />

      <section
        className="w-full"
        style={{ backgroundColor: "var(--color-brand-50)" }}
      >
        <div className="mx-6 py-8 sm:mx-10 lg:mx-16 xl:mx-24">
          <div className="mx-auto max-w-3xl rounded-xl bg-brand-600/95 p-6 text-center text-white shadow-md">
            <h2 className="text-2xl font-semibold">Support Beauty of Bronze</h2>
            <p className="mt-1 opacity-90">
              Your gift helps bring hands-on art experiences to more students.
            </p>
            <a
              href="https://givebutter.com/beautyofbronze"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-md bg-white px-4 py-2 font-medium text-brand-800 hover:bg-neutral-100"
            >
              {t("donate")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function WhatWeDoSection({
  summary,
  images,
}: {
  summary: string;
  images: string[];
}) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % images.length), 5000);
    return () => clearInterval(id);
  }, [images.length]);
  const current = images[idx] ?? null;
  return (
    <section className="relative w-full text-center">
      <div className="oval-section oval-bronze-dark">
        {/* Top curve (curved down) */}
        <div className="-mt-[1px] rotate-180 text-white dark:text-[#0f0f0f]">
          <CurveSVG />
        </div>
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h3 className="text-3xl font-semibold font-britannic">What We Do</h3>
          <p className="mx-auto mt-3 max-w-3xl text-lg text-neutral-100 md:text-xl">
            {summary}
          </p>
          {current && (
            <div className="mx-auto mt-6 max-w-3xl">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-black/20">
                <img
                  src={current}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {/* arrows removed per request */}
                {/* Fullscreen viewer removed per request */}
              </div>
              {images.length > 1 && (
                <div className="mt-2 flex justify-center gap-1">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIdx(i)}
                      className={
                        (i === idx ? "bg-white" : "bg-white/50") +
                        " h-1.5 w-6 rounded-full"
                      }
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Link
                  to="/what-we-do"
                  className="text-white underline/50 hover:underline dark:text-brand-200"
                >
                  Read more about What We Do
                </Link>
              </div>
            </div>
          )}
        </div>
        {/* Bottom curve (curved up) */}
        <div className="-mb-[1px] text-white dark:text-[#0f0f0f]">
          <CurveSVG />
        </div>
      </div>
    </section>
  );
}

function CurveSVG() {
  return (
    <svg
      className="block h-[110px] w-full"
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      fill="currentColor"
      opacity="1"
      viewBox="0 0 4.66666 0.333331"
      preserveAspectRatio="none"
    >
      <path d="M-7.87402e-006 0.0148858l0.00234646 0c0.052689,0.0154094 0.554437,0.154539 1.51807,0.166524l0.267925 0c0.0227165,-0.00026378 0.0456102,-0.000582677 0.0687992,-0.001 1.1559,-0.0208465 2.34191,-0.147224 2.79148,-0.165524l0.0180591 0 0 0.166661 -7.87402e-006 0 0 0.151783 -4.66666 0 0 -0.151783 -7.87402e-006 0 0 -0.166661z"></path>
    </svg>
  );
}

function EventsSection({
  events,
}: {
  events: {
    id: string;
    title: string;
    date?: string;
    time?: string;
    location?: string;
    paragraphs?: string[];
    featured?: string[];
    isPast?: boolean;
  }[];
}) {
  return (
    <section className="section-light w-full">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h3 className="text-2xl font-semibold font-britannic text-center">
          Events
        </h3>
        <div className="mt-6 space-y-4">
          {events.map((e) => (
            <Link
              key={e.id}
              to={`/events?event=${encodeURIComponent(e.id)}`}
              className="block"
            >
              <article
                className={
                  (e.isPast
                    ? "border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 "
                    : "border-brand-300 bg-brand-50 dark:border-neutral-700 dark:bg-neutral-900 ") +
                  "rounded-lg p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                }
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                  {e.featured && e.featured[0] && (
                    <img
                      src={e.featured[0]}
                      alt=""
                      className="h-40 w-full rounded-md object-cover sm:h-28 sm:w-28 sm:flex-none"
                    />
                  )}
                  {!e.featured?.[0] && (
                    <div className="h-40 w-full rounded-md bg-brand-200/40 sm:h-28 sm:w-28 sm:flex-none" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm uppercase tracking-wide text-brand-700">
                      {e.isPast ? "Past" : "Upcoming"}
                    </div>
                    <h4 className="mt-1 text-lg font-semibold">
                      {e.title || "Untitled"}
                    </h4>
                    <div className="text-sm text-neutral-600 dark:text-neutral-300">
                      {e.date}
                      {e.time ? ` • ${e.time}` : ""}
                      {e.location ? ` • ${e.location}` : ""}
                    </div>
                    {e.paragraphs && e.paragraphs.length > 0 && (
                      <p className="mt-2 text-sm text-neutral-800 dark:text-neutral-200">
                        {e.paragraphs[0]}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link to="/events" className="text-brand-700 hover:underline">
            View all events
          </Link>
        </div>
      </div>
    </section>
  );
}

function WhoWeAreSection({
  summary,
  staff,
  supporters,
}: {
  summary: string;
  staff: { id: string; name: string; photoUrl?: string; title?: string }[];
  supporters: {
    id: string;
    name: string;
    photoUrl?: string;
    subname?: string;
  }[];
}) {
  return (
    <section className="relative w-full">
      <div className="oval-section oval-complement">
        <div className="-mt-[1px] rotate-180 text-white dark:text-[#0f0f0f]">
          <CurveSVG />
        </div>
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h3 className="text-3xl font-semibold font-britannic text-center">
            Who We Are
          </h3>
          <p className="mx-auto mt-3 max-w-3xl text-center text-neutral-100">
            {summary}
          </p>
          <h4 className="mt-8 text-xl font-semibold text-white text-center">
            Staff
          </h4>
          <div className="mt-3 space-y-3">
            {staff.map((m) => (
              <div
                key={m.id}
                className="mx-auto flex max-w-md items-center gap-4 rounded-md border border-white/20 bg-white/5 p-4"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-white/10">
                  {m.photoUrl && (
                    <img
                      src={m.photoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold text-white">
                    {m.name}
                  </div>
                  {(m.title || "") && (
                    <div className="truncate text-base text-neutral-200">
                      {m.title}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <h4 className="mt-8 text-xl font-semibold text-white text-center">
            Supporters & Sponsors
          </h4>
          <div className="mt-3 space-y-3">
            {supporters.map((s) => (
              <div
                key={s.id}
                className="mx-auto flex max-w-md items-center gap-4 rounded-md border border-white/20 bg-white/5 p-4"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white/10">
                  {s.photoUrl && (
                    <img
                      src={s.photoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold text-white">
                    {s.name}
                  </div>
                  {s.subname && (
                    <div className="truncate text-base text-neutral-200">
                      {s.subname}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              to="/who-we-are"
              className="text-white underline/20 hover:underline"
            >
              Learn more
            </Link>
          </div>
        </div>
        <div className="-mb-[1px] text-white dark:text-[#0f0f0f]">
          <CurveSVG />
        </div>
      </div>
    </section>
  );
}

function GallerySection({ urls }: { urls: string[] }) {
  return (
    <section className="section-light w-full">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h3 className="text-2xl font-semibold font-britannic text-center">
          Gallery
        </h3>
        <div className="mx-auto mt-4 aspect-square max-w-md overflow-hidden rounded-lg fade-cycle">
          {urls.map((u, i) => (
            <img
              key={i}
              src={u}
              alt=""
              className={(i === 0 ? "is-active " : "") + "object-cover"}
            />
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link to="/gallery" className="text-brand-700 hover:underline">
            View the full gallery
          </Link>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({
  items,
  idx,
  setIdx,
}: {
  items: { id: string; paragraph: string; name: string }[];
  idx: number;
  setIdx: (i: number) => void;
}) {
  const current = items[idx] ?? null;
  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => setIdx((idx + 1) % items.length), 6000);
    return () => clearInterval(id);
  }, [items.length, idx, setIdx]);
  return (
    <section className="section-bronze-reverse w-full">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h3 className="text-2xl font-semibold font-britannic text-center">
          Testimonials
        </h3>
        {current && (
          <div className="mx-auto mt-4 max-w-3xl rounded-md border border-neutral-200 bg-white p-4 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-neutral-800">{current.paragraph}</p>
            <div className="mt-2 font-medium">— {current.name}</div>
            <div className="mt-3 flex justify-center gap-1">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={
                    (i === idx ? "bg-brand-600" : "bg-brand-300") +
                    " h-1.5 w-5 rounded-full"
                  }
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}
        {!current && (
          <div className="mt-2 text-center text-sm text-neutral-500">
            No testimonials yet
          </div>
        )}
      </div>
    </section>
  );
}

function pickRandom(arr: string[], n: number): string[] {
  const copy = [...arr];
  const out: string[] = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

function arrangeEvents(
  list: {
    id: string;
    title: string;
    date?: string;
    time?: string;
    location?: string;
    paragraphs?: string[];
    featured?: string[];
  }[]
) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const withDate = list.filter((e) => typeof e.date === "string" && e.date);
  const past = withDate
    .filter((e) => (e.date as string) < todayStr)
    .sort((a, b) => (b.date! as string).localeCompare(a.date! as string));
  const upcoming = withDate
    .filter((e) => (e.date as string) >= todayStr)
    .sort((a, b) => (a.date! as string).localeCompare(b.date! as string));
  const recentPastOne = past.slice(0, 1).map((e) => ({ ...e, isPast: true }));
  return [...recentPastOne, ...upcoming.map((e) => ({ ...e, isPast: false }))];
}
