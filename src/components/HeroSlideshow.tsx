import { useEffect, useMemo, useState } from "react";

const PLACEHOLDERS = [
  "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=2060&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=2060&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1549887534-1541e932dc0b?q=80&w=2060&auto=format&fit=crop",
];

export function HeroSlideshow() {
  const images = useMemo(() => PLACEHOLDERS, []);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 5000);
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <section className="relative isolate block w-full">
      <div className="relative z-0 h-[60vh] min-h-[340px] w-screen overflow-hidden rounded-none">
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className={
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-700 " +
              (i === index ? "opacity-100" : "opacity-0")
            }
          />
        ))}

        {/* Bottom fade to page bg */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-white dark:to-neutral-950" />
      </div>

      {/* Centered logo placeholder and tagline */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-[80%] max-w-[720px] aspect-[3/1] rounded-md bg-white/80 shadow-sm ring-1 ring-black/5 backdrop-blur dark:bg-neutral-900/60" />
        <p className="mt-5 max-w-5xl text-2xl font-extrabold leading-snug text-white [text-shadow:0_1px_1px_rgb(0_0_0_/_0.9),0_2px_6px_rgb(0_0_0_/_0.5)] sm:text-3xl md:text-4xl">
          Bringing art to all students in the Pacific Northwest, regardless of
          income.
        </p>
      </div>
    </section>
  );
}
