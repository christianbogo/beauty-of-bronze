import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/app";
import { useAuth } from "../providers/AuthProvider";
import { AdminTopBar } from "../components/AdminTopBar";
import { AdminMenuOverlay } from "../components/AdminMenuOverlay";

export function AdminHomePage() {
  const { user, isAdmin, signInWithGoogle, signOutUser } = useAuth();

  const [groups, setGroups] = useState<{ id: string; title: string; size: number }[]>([]);
  const [staffCount, setStaffCount] = useState<number | null>(null);
  const [supportersCount, setSupportersCount] = useState<number | null>(null);
  const [upcoming, setUpcoming] = useState<{ id: string; title: string; date?: string; time?: string }[]>([]);
  const [testimonialsCount, setTestimonialsCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      // Gallery groups + sizes
      try {
        const gsnap = await getDocs(query(collection(db, "galleryGroups"), orderBy("date", "desc")));
        const groupDocs = gsnap.docs.map((d) => ({ id: d.id, title: (d.data() as any).title || "Untitled" }));
        const withSizes = await Promise.all(
          groupDocs.map(async (g) => {
            const psnap = await getDocs(collection(db, "galleryGroups", g.id, "photos"));
            return { ...g, size: psnap.size };
          })
        );
        setGroups(withSizes);
      } catch {}

      // Staff & Supporters counts
      try {
        const ssnap = await getDocs(collection(db, "staffMembers"));
        setStaffCount(ssnap.size);
      } catch {}
      try {
        const csnap = await getDocs(collection(db, "supporters"));
        setSupportersCount(csnap.size);
      } catch {}

      // Upcoming events (next 3)
      try {
        const esnap = await getDocs(query(collection(db, "events"), orderBy("date", "asc")));
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        const list = esnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((e) => (e.date || "") >= todayStr)
          .slice(0, 3)
          .map((e) => ({ id: e.id, title: e.title || "Untitled", date: e.date, time: e.time }));
        setUpcoming(list);
      } catch {}

      // Testimonials count
      try {
        const tsnap = await getDocs(collection(db, "testimonials"));
        setTestimonialsCount(tsnap.size);
      } catch {}
    })();
  }, []);

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-neutral-600">Sign in with Google to continue.</p>
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
        <p className="mt-2 text-neutral-600">Your account is not authorized as an admin.</p>
        <div className="mt-6 flex gap-3">
          <Link to="/" className="underline">Go home</Link>
          <button onClick={signOutUser} className="underline">Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <AdminTopBar />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Admin Home</h1>
        <p className="mt-2 text-neutral-700">Shortcuts</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/admin/gallery" className="rounded-md border border-neutral-300 bg-white p-4 hover:bg-neutral-50">
            <div className="text-lg font-semibold">Photo Manager</div>
            <div className="mt-1 text-sm text-neutral-600">Manage all site photos</div>
            <ul className="mt-2 space-y-1 text-sm text-neutral-700">
              {groups.slice(0, 5).map((g) => (
                <li key={g.id} className="flex justify-between">
                  <span className="truncate pr-2">{g.title}</span>
                  <span className="text-neutral-500">{g.size}</span>
                </li>
              ))}
              {groups.length === 0 && <li className="text-neutral-500">No groups yet</li>}
            </ul>
          </Link>
          <Link to="/admin/content/what-we-do" className="rounded-md border border-neutral-300 bg-white p-4 hover:bg-neutral-50">
            <div className="text-lg font-semibold">About BOB</div>
            <div className="mt-1 text-sm text-neutral-600">What We Do & Who We Are</div>
            <div className="mt-2 text-sm text-neutral-700">
              <div>Staff Members: {staffCount ?? "—"}</div>
              <div>Supporters & Sponsors: {supportersCount ?? "—"}</div>
            </div>
          </Link>
          <Link to="/admin/content/events" className="rounded-md border border-neutral-300 bg-white p-4 hover:bg-neutral-50">
            <div className="text-lg font-semibold">Event Manager</div>
            <div className="mt-1 text-sm text-neutral-600">Add and edit events</div>
            <ul className="mt-2 space-y-1 text-sm text-neutral-700">
              {upcoming.map((e) => (
                <li key={e.id} className="truncate">
                  <span className="font-medium">{e.title}</span>
                  <span className="text-neutral-500"> — {e.date}{e.time ? ` ${e.time}` : ""}</span>
                </li>
              ))}
              {upcoming.length === 0 && <li className="text-neutral-500">No upcoming events</li>}
            </ul>
          </Link>
          <Link to="/admin/content/testimonials" className="rounded-md border border-neutral-300 bg-white p-4 hover:bg-neutral-50">
            <div className="text-lg font-semibold">Testimonials</div>
            <div className="mt-1 text-sm text-neutral-600">Add, edit, sort testimonials</div>
            <div className="mt-2 text-sm text-neutral-700">Total: {testimonialsCount ?? "—"}</div>
          </Link>
        </div>
      </main>
      <AdminMenuOverlay />
    </div>
  );
}


