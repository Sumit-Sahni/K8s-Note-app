"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Note = { id: number; text: string };

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [pod, setPod] = useState("");
  const [text, setText] = useState("");
  const [up, setUp] = useState<boolean | null>(null); // null = not checked yet

  // Ask the backend for the notes. "/api/notes" is passed on to the backend as "/notes".
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notes", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setNotes(data.notes);
      setPod(data.pod);
      setUp(true);
    } catch {
      setUp(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [load]);

  // Click "Add": send the new note to the backend
  async function add(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch(() => {});
    setText("");
    load();
  }

  // Click "Delete": tell the backend to remove the note
  async function remove(id: number) {
    await fetch(`/api/notes/${id}`, { method: "DELETE" }).catch(() => {});
    load();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto max-w-xl px-5 py-10">
        <h1 className="text-3xl font-bold">Notes with Two Container's</h1>
        <p className="mb-5 mt-1 text-sm text-slate-400">
          Every click on this page sends a request to the backend container.
        </p>

        {/* Shows the path a click takes */}
        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1">Browser</span>
          <span>&rarr;</span>
          <span className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1">
            Frontend (Next.js)
          </span>
          <span>&rarr;</span>
          <span className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1">
            Backend (API)
          </span>
        </div>

        {/* Backend status */}
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              up === null ? "bg-slate-500" : up ? "bg-emerald-400" : "bg-red-400"
            }`}
          />
          {up === null && "Checking backend..."}
          {up === true && (
            <>
              Backend connected
              <span className="font-mono text-xs text-slate-400">pod: {pod}</span>
            </>
          )}
          {up === false && "Backend unavailable"}
        </div>

        <form onSubmit={add} className="mb-4 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a note..."
            maxLength={200}
            className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400"
          />
          <button
            type="submit"
            disabled={!up}
            className="rounded-lg bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        </form>

        {/* The notes (or an error when the backend is down) */}
        <div
          className={`rounded-xl border bg-slate-900 px-4 py-1.5 ${
            up === false ? "border-red-400" : "border-slate-800"
          }`}
        >
          {up === false && <div className="py-3.5 font-semibold text-red-400">Cannot reach the backend</div>}
          {up && notes.length === 0 && (
            <div className="py-3.5 text-sm text-slate-400">No notes yet. Add one above.</div>
          )}
          {up &&
            notes.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between gap-3 border-b border-slate-800 py-2.5 last:border-b-0"
              >
                <span className="min-w-0 wrap-break-word">{n.text}</span>
                <button
                  onClick={() => remove(n.id)}
                  className="rounded-md border border-slate-800 px-2.5 py-1 text-sm text-red-400 hover:border-red-400"
                >
                  Delete
                </button>
              </div>
            ))}
        </div>
      </main>
    </div>
  );
}