import { useEffect, useRef, useState } from "react";
import { useAuth } from "../providers/AuthProvider";
import { Link } from "react-router-dom";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase/app";
import { storage } from "../firebase/app";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { AdminTopBar } from "../components/AdminTopBar";
import { AdminMenuOverlay } from "../components/AdminMenuOverlay";
import { Pencil, Trash2 } from "lucide-react";

type Photo = {
  id: string;
  caption: string;
  date?: string; // ISO date
  url?: string; // storage URL
  order?: number; // sort order
  fileName?: string; // original file name
  name?: string; // display name
};

type Group = {
  id: string;
  title: string;
  description: string;
  date?: string; // ISO date
};

export function AdminGalleryPage() {
  const { user, isAdmin, signInWithGoogle } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newGroupDate, setNewGroupDate] = useState<string>("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [groupSizes, setGroupSizes] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<{ by: "title" | "date" | "size"; dir: "asc" | "desc" }>({ by: "date", dir: "desc" });
  function handleSort(col: "title" | "date" | "size") {
    setSort((s) => (s.by === col ? { by: col, dir: s.dir === "asc" ? "desc" : "asc" } : { by: col, dir: "asc" }));
  }
  const [uploads, setUploads] = useState<
    { id: string; name: string; progress: number; status: "uploading" | "done" | "error" }[]
  >([]);

  // Auto-clear uploads list shortly after all complete
  useEffect(() => {
    if (!uploads.length) return;
    if (uploads.every((u) => u.status !== "uploading")) {
      const t = setTimeout(() => setUploads([]), 1200);
      return () => clearTimeout(t);
    }
  }, [uploads]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    let mounted = true;
    setLoading(true);
    const load = async () => {
      const groupsSnap = await getDocs(
        query(collection(db, "galleryGroups"), orderBy("date", "desc"))
      );
      const allGroups: Group[] = [];
      for (const g of groupsSnap.docs) {
        const data = g.data() as any;
        allGroups.push({
          id: g.id,
          title: data.title ?? "",
          description: data.description ?? "",
          date: data.date ?? undefined,
        });
      }
      if (!mounted) return;
      setGroups(allGroups);
      if (allGroups.length && !selectedGroup) setSelectedGroup(allGroups[0].id);
      // Load group sizes
      const sizes: Record<string, number> = {};
      await Promise.all(
        allGroups.map(async (g) => {
          const snap = await getDocs(collection(db, "galleryGroups", g.id, "photos"));
          sizes[g.id] = snap.size;
        })
      );
      if (!mounted) return;
      setGroupSizes(sizes);
    };
    load().finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [user, isAdmin]);

  useEffect(() => {
    if (!selectedGroup) return;
    let mounted = true;
    setLoading(true);
    const load = async () => {
      const photosSnap = await getDocs(
        query(collection(db, "galleryGroups", selectedGroup, "photos"), orderBy("order", "asc"))
      );
      const all: Photo[] = [];
      for (const p of photosSnap.docs) {
        const data = p.data() as any;
        all.push({
          id: p.id,
          caption: data.caption ?? "",
          date: data.date ?? undefined,
          url: data.url ?? undefined,
          order: data.order ?? undefined,
          fileName: data.fileName ?? undefined,
          name: data.name ?? undefined,
        });
      }
      if (!mounted) return;
      // If order is missing, assign sequentially and persist
      if (all.some((p) => typeof p.order !== "number")) {
        const batch = writeBatch(db);
        const normalized = all.map((p, i) => ({ ...p, order: i }));
        for (const p of normalized) {
          batch.set(
            doc(db, "galleryGroups", selectedGroup, "photos", p.id),
            { order: p.order },
            { merge: true }
          );
        }
        await batch.commit();
        setPhotos(normalized);
      } else {
        setPhotos(all);
      }
    };
    load().finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [selectedGroup]);

  function newGroupDefaults(name: string): Group {
    const today = new Date().toISOString().slice(0, 10);
    return {
      id: crypto.randomUUID(),
      title: name,
      description: `${name} highlights`,
      date: today,
    };
  }

  

  async function addGroup() {
    const name = newGroupTitle.trim();
    if (!name) return;
    const g = newGroupDefaults(name);
    if (newGroupDate) g.date = newGroupDate;
    setGroups((prev) => [g, ...prev]);
    setSelectedGroup(g.id);
    setSaving(true);
    try {
      await setDoc(doc(db, "galleryGroups", g.id), {
        title: g.title,
        description: g.description,
        date: g.date,
      });
    } finally {
      setSaving(false);
    }
    setNewGroupTitle("");
    setNewGroupDate("");
    setShowAddForm(false);
  }

  async function saveGroupMeta(group: Group) {
    setSaving(true);
    try {
      await setDoc(
        doc(db, "galleryGroups", group.id),
        {
          title: group.title,
          description: group.description,
          date: group.date,
        },
        { merge: true }
      );
    } finally {
      setSaving(false);
    }
  }

  

  async function uploadPhotos(files: FileList | null) {
    if (!files || !selectedGroup) return;
    setSaving(true);
    try {
      const currentMaxOrder = photos.reduce((m, p) => Math.max(m, p.order ?? -1), -1);
      let base = currentMaxOrder + 1;
      const filesArr = Array.from(files);
      const groupTitle = groups.find((g) => g.id === selectedGroup)?.title ?? "Gallery";
      const startIndex = groupSizes[selectedGroup] ?? 0;
      for (let idx = 0; idx < filesArr.length; idx++) {
        const file = filesArr[idx];
        const id = crypto.randomUUID();
        const storagePath = `galleryGroups/${selectedGroup}/${id}-${file.name}`;
        const sref = ref(storage, storagePath);
        // track progress
        setUploads((prev) => [...prev, { id, name: file.name, progress: 0, status: "uploading" }]);
        const task = uploadBytesResumable(sref, file);
        await new Promise<string>((resolve, reject) => {
          task.on(
            "state_changed",
            (snap) => {
              const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
              setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress: pct } : u)));
            },
            (err) => {
              setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: "error" } : u)));
              reject(err);
            },
            async () => {
              const url = await getDownloadURL(task.snapshot.ref);
              setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress: 100, status: "done" } : u)));
              resolve(url);
            }
          );
        }).then(async (url) => {
          const newPhoto: Photo = {
            id,
            fileName: file.name,
            name: `${groupTitle} ${startIndex + idx + 1}`,
            caption: "",
            date: new Date().toISOString().slice(0, 10),
            url: url as string,
            order: base++,
          };
          await setDoc(doc(db, "galleryGroups", selectedGroup, "photos", id), newPhoto);
          setPhotos((prev) => [...prev, newPhoto]);
        });
      }
      setGroupSizes((prev) => ({ ...prev, [selectedGroup]: (prev[selectedGroup] ?? 0) + filesArr.length }));
    } finally {
      setSaving(false);
    }
  }

  async function saveOrder(all: Photo[]) {
    if (!selectedGroup) return;
    const batch = writeBatch(db);
    all.forEach((p, i) => {
      const order = i;
      batch.set(doc(db, "galleryGroups", selectedGroup, "photos", p.id), { order }, { merge: true });
    });
    await batch.commit();
  }

  async function removePhoto(id: string, url?: string) {
    if (!selectedGroup) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "galleryGroups", selectedGroup, "photos", id));
      if (url) {
        try {
          const objectRef = ref(storage, url);
          await deleteObject(objectRef);
        } catch {}
      }
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      setGroupSizes((prev) => ({ ...prev, [selectedGroup]: Math.max(0, (prev[selectedGroup] ?? 1) - 1) }));
    } finally {
      setSaving(false);
    }
  }

  async function removeGroup(groupId: string) {
    if (!confirm("Delete this group and all its photos? This cannot be undone.")) {
      return;
    }
    setSaving(true);
    try {
      // Delete all photos in subcollection
      const photosSnap = await getDocs(collection(db, "galleryGroups", groupId, "photos"));
      const batch = writeBatch(db);
      const urls: string[] = [];
      photosSnap.forEach((d) => {
        const data = d.data() as any;
        if (data?.url) urls.push(data.url as string);
        batch.delete(doc(db, "galleryGroups", groupId, "photos", d.id));
      });
      batch.delete(doc(db, "galleryGroups", groupId));
      await batch.commit();
      // Try to delete storage objects (best-effort)
      await Promise.all(
        urls.map(async (u) => {
          try {
            const r = ref(storage, u);
            await deleteObject(r);
          } catch {}
        })
      );
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (selectedGroup === groupId) {
        setSelectedGroup(null);
        setPhotos([]);
      }
      setGroupSizes((prev) => {
        const { [groupId]: _, ...rest } = prev;
        return rest;
      });
    } finally {
      setSaving(false);
    }
  }

  function beginEditGroup(g: Group) {
    setEditingGroupId(g.id);
    setEditingGroup({ ...g });
  }

  async function saveEditGroup() {
    if (!editingGroup || !editingGroupId) return;
    await saveGroupMeta(editingGroup);
    setGroups((prev) => prev.map((x) => (x.id === editingGroup.id ? editingGroup : x)));
    setEditingGroupId(null);
    setEditingGroup(null);
  }

  function cancelEditGroup() {
    setEditingGroupId(null);
    setEditingGroup(null);
  }

  async function savePhoto(p: Photo) {
    if (!selectedGroup) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "galleryGroups", selectedGroup, "photos", p.id),
        { caption: p.caption, date: p.date, name: p.name },
        { merge: true }
      );
      setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...p } : x)));
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Admin Gallery</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">
          Sign in with Google to continue.
        </p>
        <button
          onClick={signInWithGoogle}
          className="mt-6 rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
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
        <Link to="/" className="mt-6 inline-block underline">
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <AdminTopBar />
      <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Gallery</h1>
        <div className="flex items-center gap-2">
          {saving && <span className="text-sm text-neutral-500">Saving…</span>}
        </div>
      </div>

        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Groups</div>
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-100"
              >
                {showAddForm ? "Cancel" : "New Group"}
              </button>
            </div>
            {/* New group toggle + form */}
            <div className="mt-2">
              {showAddForm && (
                <div className="mt-3 rounded-md border border-neutral-300 bg-white p-3">
                  <div className="text-sm font-medium">Add new group</div>
                  <div className="mt-2 grid gap-2">
                    <input
                      placeholder="Title"
                      value={newGroupTitle}
                      onChange={(e) => setNewGroupTitle(e.target.value)}
                      className="w-full rounded-md border border-neutral-300 bg-white p-2"
                    />
                    <input
                      type="date"
                      value={newGroupDate}
                      onChange={(e) => setNewGroupDate(e.target.value)}
                      className="w-full rounded-md border border-neutral-300 bg-white p-2"
                    />
                    <button
                      onClick={addGroup}
                      className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
                    >
                      Create group
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Edit group form */}
            {editingGroupId && editingGroup && (
              <div className="mt-4 rounded-md border border-neutral-300 bg-white p-3">
                <div className="text-sm font-medium">Edit group</div>
                <div className="mt-2 grid gap-2">
                  <input
                    value={editingGroup.title}
                    onChange={(e) => setEditingGroup({ ...editingGroup, title: e.target.value })}
                    className="w-full rounded-md border border-neutral-300 bg-white p-2"
                  />
                  <input
                    type="date"
                    value={editingGroup.date ?? ""}
                    onChange={(e) => setEditingGroup({ ...editingGroup, date: e.target.value })}
                    className="w-full rounded-md border border-neutral-300 bg-white p-2"
                  />
                  <textarea
                    rows={3}
                    value={editingGroup.description}
                    onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                    className="w-full rounded-md border border-neutral-300 bg-white p-2"
                  />
                  <div className="flex items-center gap-2">
                    <button onClick={saveEditGroup} className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">Save</button>
                    <button onClick={cancelEditGroup} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Groups table with sorting and size */}
            <div className="mt-4 overflow-hidden rounded-md border border-neutral-300 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium cursor-pointer select-none" onClick={() => handleSort("title")}>
                      Title {sort.by === "title" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th className="px-3 py-2 text-left font-medium cursor-pointer select-none" onClick={() => handleSort("date")}>
                      Date {sort.by === "date" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th className="px-3 py-2 text-left font-medium cursor-pointer select-none" onClick={() => handleSort("size")}>
                      Size {sort.by === "size" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th className="px-3 py-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {groups
                    .slice()
                    .sort((a, b) => {
                      if (sort.by === "title") {
                        const av = a.title?.toLowerCase() ?? "";
                        const bv = b.title?.toLowerCase() ?? "";
                        return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
                      }
                      if (sort.by === "date") {
                        const av = a.date ?? "";
                        const bv = b.date ?? "";
                        return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
                      }
                      const av = groupSizes[a.id] ?? 0;
                      const bv = groupSizes[b.id] ?? 0;
                      return sort.dir === "asc" ? av - bv : bv - av;
                    })
                    .map((g) => {
                    const active = selectedGroup === g.id;
                    return (
                      <tr
                        key={g.id}
                        className={"group cursor-pointer border-t border-neutral-200 " + (active ? "bg-brand-50" : "hover:bg-neutral-50")}
                        onClick={() => setSelectedGroup(g.id)}
                      >
                        <td className="px-3 py-2">{g.title}</td>
                        <td className="px-3 py-2">{g.date}</td>
                        <td className="px-3 py-2">{groupSizes[g.id] ?? 0}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                beginEditGroup(g);
                              }}
                              className="rounded-md border border-neutral-300 p-1 hover:bg-neutral-100"
                              aria-label="Edit group"
                              title="Edit group"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeGroup(g.id);
                              }}
                              className="rounded-md border border-neutral-300 p-1 text-red-700 hover:bg-neutral-100"
                              aria-label="Remove group"
                              title="Remove group"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Upload controls under groups */}
          <section>
            <div className="rounded-md border border-neutral-300 bg-white p-3">
              <div className="text-sm font-medium">Upload photos</div>
              <p className="mt-1 text-sm text-neutral-600">Select one or more images to upload to the selected group.</p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={(e) => uploadPhotos(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center rounded-md border border-neutral-300 bg-neutral-100 px-4 py-2 text-sm font-medium hover:bg-neutral-200"
                >
                  Browse…
                </button>
              </div>
              {uploads.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploads.map((u) => (
                    <div key={u.id} className="text-xs">
                      <div className="flex items-center justify-between">
                        <span className="truncate pr-2">{u.name}</span>
                        <span>{u.progress}%</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded bg-neutral-200">
                        <div
                          className={
                            "h-full transition-all " +
                            (u.status === "error"
                              ? "bg-red-500"
                              : u.status === "done"
                              ? "bg-green-600"
                              : "bg-neutral-700")
                          }
                          style={{ width: `${u.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
        <div>
          {loading && <div className="text-sm text-neutral-500">Loading…</div>}
          {selectedGroup && (
            <PhotoManager
              key={selectedGroup}
              photos={photos}
              onChangePhotos={setPhotos}
              onSaveOrder={saveOrder}
              onSavePhoto={savePhoto}
              onRemovePhoto={removePhoto}
              groupTitle={groups.find((g) => g.id === selectedGroup)?.title ?? "Gallery"}
            />
          )}
        </div>
          </section>
      </div>
      </div>
      <AdminMenuOverlay />
    </div>
  );
}

function PhotoManager({
  photos,
  onChangePhotos,
  onSaveOrder,
  onSavePhoto,
  onRemovePhoto,
  groupTitle,
}: {
  photos: Photo[];
  onChangePhotos: (p: Photo[]) => void;
  onSaveOrder: (list: Photo[]) => void;
  onSavePhoto: (p: Photo) => void;
  onRemovePhoto: (id: string, url?: string) => void;
  groupTitle: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = photos.find((p) => p.id === selectedId) || null;
  const [previewHeight, setPreviewHeight] = useState<number>(224);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);
  const [draft, setDraft] = useState<Photo | null>(null);
  const [, setSaveError] = useState<string>("");
  const [savingDraft, setSavingDraft] = useState(false);

  // Keep a local editable draft of the selected photo
  useEffect(() => {
    if (!selected) {
      setDraft(null);
      setSaveError("");
      return;
    }
    setDraft({ ...selected });
    setSaveError("");
  }, [selectedId]);

  // If photo name is missing, default to "<Group> <index>"
  useEffect(() => {
    if (!selected) return;
    if (!selected.name || selected.name.trim() === "") {
      const idx = photos.findIndex((p) => p.id === selected.id);
      const inferred = `${groupTitle} ${idx + 1}`;
      setDraft((prev) => ({ ...(prev || selected), name: inferred }));
    }
  }, [selectedId, photos.length, groupTitle]);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Grid container */}
      <div className="md:col-span-2">
        <div className="text-sm font-medium">Photos</div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((p, i) => (
            <div
              key={p.id}
              className={(selectedId === p.id ? "ring-2 ring-neutral-800 " : "") + "relative cursor-move overflow-hidden rounded-md border border-neutral-300 bg-white"}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const from = Number(e.dataTransfer.getData("text/plain"));
                if (Number.isNaN(from)) return;
                const to = i;
                const next = reorder(photos, from, to).map((x, idx) => ({ ...x, order: idx }));
                onChangePhotos(next);
                onSaveOrder(next);
              }}
              onClick={() => setSelectedId(p.id)}
            >
              {p.url ? (
                <img src={p.url} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <div className="aspect-square w-full bg-neutral-200" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detail editor */}
      <div>
        <div className="text-sm font-medium">Details</div>
        {!selected && (
          <div className="mt-2 rounded-md border border-neutral-300 bg-white p-3 text-sm text-neutral-500">
            Select a photo to edit its details.
          </div>
        )}
        {selected && (
          <div className="mt-2 space-y-3 rounded-md border border-neutral-300 bg-white p-3">
            {/* Preview - object-contain, no cropping */}
            <div className="w-full overflow-hidden rounded-md border border-neutral-200 bg-neutral-50" style={{ height: previewHeight }}>
              {selected.url ? (
                <img src={selected.url} alt="" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
                  No preview available
                </div>
              )}
            </div>
            {/* Resize handle */}
            <div
              className="flex cursor-row-resize items-center justify-center py-1 text-[10px] text-neutral-500 hover:text-neutral-700"
              onMouseDown={(e) => {
                dragRef.current = { startY: e.clientY, startH: previewHeight };
                const onMove = (ev: MouseEvent) => {
                  if (!dragRef.current) return;
                  const delta = ev.clientY - dragRef.current.startY;
                  const next = Math.min(600, Math.max(160, dragRef.current.startH + delta));
                  setPreviewHeight(next);
                };
                const onUp = () => {
                  window.removeEventListener("mousemove", onMove);
                  window.removeEventListener("mouseup", onUp);
                  dragRef.current = null;
                };
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
              }}
            >
              ▬
            </div>
            {/* File name field removed per spec */}
            <label className="block text-sm">
              <div className="mb-1 font-medium">Photo name</div>
              <input
                className="w-full rounded-md border border-neutral-300 bg-white p-2"
                value={draft?.name ?? ""}
                onChange={(e) => setDraft({ ...(draft || selected!), name: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <div className="mb-1 font-medium">Picture date (optional)</div>
              <input
                type="date"
                className="w-full rounded-md border border-neutral-300 bg-white p-2"
                value={draft?.date ?? ""}
                onChange={(e) => setDraft({ ...(draft || selected!), date: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <div className="mb-1 font-medium">Caption/Description</div>
              <textarea
                className="w-full rounded-md border border-neutral-300 bg-white p-2"
                rows={3}
                value={draft?.caption ?? ""}
                onChange={(e) => setDraft({ ...(draft || selected!), caption: e.target.value })}
              />
            </label>
            {/* No validation errors currently shown */}
            {(() => {
              const isDirty = !!draft && !!selected && (
                (draft.name ?? "") !== (selected.name ?? "") ||
                (draft.date ?? "") !== (selected.date ?? "") ||
                (draft.caption ?? "") !== (selected.caption ?? "")
              );
              if (!isDirty) {
                return (
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => selected && onRemovePhoto(selected.id, selected.url)}
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
                    >
                      Delete photo
                    </button>
                  </div>
                );
              }
              return (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => selected && onRemovePhoto(selected.id, selected.url)}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
                  >
                    Delete photo
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDraft(selected!)}
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!draft || savingDraft}
                      onClick={async () => {
                        if (!draft) return;
                        setSavingDraft(true);
                        try {
                          await onSavePhoto(draft);
                          setDraft(draft);
                        } finally {
                          setSavingDraft(false);
                        }
                      }}
                      className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
                    >
                      {savingDraft ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function reorder<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
