export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 text-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-8 text-center">
        <a
          href="mailto:beautyofbronzencw@gmail.com"
          className="font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          beautyofbronzencw@gmail.com
        </a>
        <div className="mt-2 text-xs text-neutral-500">
          Managed by{" "}
          <a
            href="https://gravatar.com/christianbcutter"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Christian Cutter
          </a>
          <span className="mx-2">·</span>
          <a href="/admin" className="underline">
            I am an Admin
          </a>
        </div>
      </div>
    </footer>
  );
}
