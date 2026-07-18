import { useState, useEffect } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabaseClient";

const CATEGORIES = [
  { id: "bangers", label: "Bangers" },
  { id: "classiques", label: "Classiques" },
  { id: "kdo", label: "Seconds" },
];

export default function Admin() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");

  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    brand: "",
    name: "",
    description: "",
    size: "",
    condition: "",
    price: "",
    tag: "",
    category: "bangers",
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  useEffect(() => {
    if (authed) fetchProducts();
  }, [authed]);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts(data || []);
  }

  function tryLogin(e) {
    e.preventDefault();
    // Just a soft client-side gate — the real protection is on the API route.
    setAuthError("");
    setAuthed(true);
  }

  function handleImageChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setImageFiles(files);
    setImagePreviews(files.map((f) => URL.createObjectURL(f)));
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const imagesPayload = await Promise.all(
        imageFiles.map(async (file) => ({
          imageBase64: await fileToBase64(file),
          imageType: file.type,
        }))
      );

      const res = await fetch("/api/admin-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ ...form, price: parseFloat(form.price), images: imagesPayload }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage("Erreur : " + (data.error || "inconnue"));
        if (res.status === 401) setAuthed(false);
      } else {
        setMessage("Pièce ajoutée ✓");
        setForm({
          brand: "",
          name: "",
          description: "",
          size: "",
          condition: "",
          price: "",
          tag: "",
          category: "bangers",
        });
        setImageFiles([]);
        setImagePreviews([]);
        fetchProducts();
      }
    } catch (err) {
      setMessage("Erreur réseau.");
    }
    setSubmitting(false);
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer cette pièce ?")) return;
    const res = await fetch("/api/admin-products", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({ id }),
    });
    if (res.ok) fetchProducts();
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-6 font-mono">
        <Head><title>Admin — CNCRT DROP</title></Head>
        <form onSubmit={tryLogin} className="w-full max-w-xs flex flex-col gap-3">
          <h1 className="text-stone-100 text-sm uppercase tracking-widest font-bold mb-2">Accès admin</h1>
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 text-stone-100 px-3 py-2 text-sm"
          />
          {authError && <p className="text-pink-500 text-xs">{authError}</p>}
          <button className="bg-pink-600 text-white text-xs uppercase tracking-widest font-bold py-2">
            Entrer
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 font-mono px-4 sm:px-6 py-8">
      <Head><title>Admin — CNCRT DROP</title></Head>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-lg font-bold uppercase tracking-tight mb-6">Ajouter une pièce</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 bg-white border border-neutral-200 p-5 mb-10">
          <input
            required
            placeholder="Marque (ex: Lacoste)"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            className="border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Nom de l'article (ex: Polo piqué rayé)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-neutral-300 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description (matière, coupe, détails...)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border border-neutral-300 px-3 py-2 text-sm min-h-[80px]"
          />
          <div className="flex gap-3">
            <input
              required
              placeholder="Taille (M, L, 42...)"
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              className="border border-neutral-300 px-3 py-2 text-sm flex-1"
            />
            <input
              required
              placeholder="État (9/10...)"
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              className="border border-neutral-300 px-3 py-2 text-sm flex-1"
            />
          </div>
          <div className="flex gap-3">
            <input
              required
              type="number"
              step="0.01"
              placeholder="Prix (€)"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="border border-neutral-300 px-3 py-2 text-sm flex-1"
            />
            <input
              placeholder="Tag (RARE, NEW, DROP 03...)"
              value={form.tag}
              onChange={(e) => setForm({ ...form, tag: e.target.value })}
              className="border border-neutral-300 px-3 py-2 text-sm flex-1"
            />
          </div>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="border border-neutral-300 px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          <label className="text-xs uppercase tracking-widest text-neutral-500 font-bold mt-1">
            Photos (plusieurs possibles)
          </label>
          <input type="file" accept="image/*" multiple onChange={handleImageChange} className="text-sm" />
          {imagePreviews.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {imagePreviews.map((src, i) => (
                <img key={i} src={src} alt="preview" className="w-20 h-24 object-cover border border-neutral-300" />
              ))}
            </div>
          )}

          <button
            disabled={submitting}
            className="mt-2 bg-neutral-900 disabled:bg-neutral-400 text-white text-xs uppercase tracking-widest font-bold py-3"
          >
            {submitting ? "Ajout en cours..." : "Ajouter la pièce"}
          </button>
          {message && <p className="text-xs text-neutral-600">{message}</p>}
        </form>

        <h2 className="text-sm font-bold uppercase tracking-tight mb-4">Pièces en ligne ({products.length})</h2>
        <div className="flex flex-col gap-2">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-white border border-neutral-200 p-2">
              {p.image_url && (
                <img src={p.image_url} alt={p.name} className="w-12 h-14 object-cover border border-neutral-200" />
              )}
              <div className="flex-1 text-xs">
                <div className="font-bold uppercase tracking-widest text-[10px] text-neutral-400">{p.brand}</div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-neutral-500">{p.price}€ · {p.category}</div>
              </div>
              <button
                onClick={() => handleDelete(p.id)}
                className="text-pink-600 text-xs uppercase tracking-widest font-bold px-2"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
