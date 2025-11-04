import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/app";

export type PageKey =
  | "home"
  | "what-we-do"
  | "who-we-are"
  | "events"
  | "supporters"
  | "gallery"
  | "testimonials";

export type PageContent = {
  summary: string;
  paragraphs: string[];
  featured: string[]; // gallery photo IDs
  banner?: string; // optional, used for home only
};

const pagesCol = collection(db, "pages");

export async function fetchPageContent(
  page: PageKey
): Promise<PageContent | null> {
  const ref = doc(pagesCol, page);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<PageContent>;
  return {
    summary: data.summary ?? "",
    paragraphs: Array.isArray(data.paragraphs)
      ? (data.paragraphs as string[])
      : [],
    featured: Array.isArray(data.featured) ? (data.featured as string[]) : [],
    banner: data.banner ?? undefined,
  };
}

export async function savePageContent(
  page: PageKey,
  content: PageContent
): Promise<void> {
  const ref = doc(pagesCol, page);
  // Remove undefined fields to avoid Firestore errors
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(content)) {
    if (v !== undefined) clean[k] = v as unknown;
  }
  await setDoc(ref, clean, { merge: true });
}
