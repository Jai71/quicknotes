"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { z } from "zod";

const NoteSchema = z.object({
  title: z
    .string()
    .trim()
    .max(80, "Title must be 80 characters or less"),
  content: z
    .string()
    .trim()
    .min(1, "Content cannot be empty")
    .max(5000, "Content must be 5000 characters or less"),
});

function validateNoteOrAlert(title: string, content: string) {
  const parsed = NoteSchema.safeParse({ title, content });
  if (!parsed.success) {
    alert(parsed.error.issues[0]?.message ?? "Invalid input");
    return null;
  }
  return parsed.data; // { title: trimmedTitle, content: trimmedContent }
}

type Note = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export default function Home() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function refreshSession() {
    const { data } = await supabase.auth.getSession();
    setUserEmail(data.session?.user?.email ?? null);
  }

  async function loadNotes() {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("notes")
      .select("id,title,content,created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const nextNotes = data as Note[];
      setNotes(nextNotes);
      if (editingId && !nextNotes.some((n) => n.id === editingId)) {
        setEditingId(null);
        setTitle("");
        setContent("");
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    refreshSession();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshSession();
      loadNotes();
    });
    loadNotes();
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) alert(error.message);
    else alert("Signed up! If email confirmation is on, check your inbox.");
  }

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) alert(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function addNote() {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      alert("Please sign in.");
      setLoading(false);
      return;
    }

    const clean = validateNoteOrAlert(title, content);
    if (!clean) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      title: clean.title,
      content: clean.content,
    });

    setLoading(false);
    if (error) alert(error.message);
    else {
      setTitle("");
      setContent("");
      await loadNotes();
    }
  }

  async function deleteNote(id: string) {
    setLoading(true);
    const { error } = await supabase.from("notes").delete().eq("id", id);
    setLoading(false);
    if (error) alert(error.message);
    else await loadNotes();
  }

  async function updateNote() {
    if (!editingId) return;

    const clean = validateNoteOrAlert(title, content);
    if (!clean) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("notes")
        .update({ title: clean.title, content: clean.content })
        .eq("id", editingId);

      if (error) {
        alert(error.message);
        return;
      }

      setEditingId(null);
      setTitle("");
      setContent("");
      await loadNotes();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">QuickNotes</h1>
        {userEmail ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{userEmail}</span>
            <button
              className="px-3 py-2 rounded-md border"
              onClick={signOut}
              disabled={loading}
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>

      {!userEmail ? (
        <section className="mt-6 p-4 border rounded-lg">
          <h2 className="font-medium">Sign in / Sign up</h2>
          <div className="mt-3 grid gap-2">
            <input
              className="border rounded-md p-2"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="border rounded-md p-2"
              placeholder="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded-md border" onClick={signIn} disabled={loading}>
                Sign in
              </button>
              <button className="px-3 py-2 rounded-md border" onClick={signUp} disabled={loading}>
                Sign up
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-6 p-4 border rounded-lg">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-medium">{editingId ? "Edit note" : "New note"}</h2>
            {editingId ? (
              <span className="text-xs text-gray-500">Editing mode</span>
            ) : null}
          </div>
          <div className="mt-3 grid gap-2">
            <input
              className="border rounded-md p-2"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="border rounded-md p-2 min-h-[120px]"
              placeholder="Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex gap-2 items-center">
              <button
                className="px-3 py-2 rounded-md border"
                onClick={editingId ? updateNote : addNote}
                disabled={loading}
              >
                {editingId ? "Save changes" : "Add note"}
              </button>
              {editingId ? (
                <button
                  className="px-3 py-2 rounded-md border"
                  onClick={() => {
                    setEditingId(null);
                    setTitle("");
                    setContent("");
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
              ) : null}
              {loading ? <span className="text-sm text-gray-500">Working…</span> : null}
            </div>
          </div>
        </section>
      )}

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Your notes</h2>
          <button className="text-sm underline" onClick={loadNotes} disabled={loading}>
            Refresh
          </button>
        </div>

        <div className="mt-3 grid gap-3">
          {notes.map((n) => (
            <div key={n.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{n.title || "(untitled)"}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-gray-700">{n.content}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-2 rounded-md border"
                    onClick={() => {
                      setEditingId(n.id);
                      setTitle(n.title ?? "");
                      setContent(n.content ?? "");
                      // Scroll the form into view for convenience
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button
                    className="px-3 py-2 rounded-md border"
                    onClick={() => deleteNote(n.id)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!loading && userEmail && notes.length === 0 ? (
            <p className="text-sm text-gray-500">No notes yet.</p>
          ) : null}
          {!userEmail ? (
            <p className="text-sm text-gray-500">Sign in to see your notes.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
