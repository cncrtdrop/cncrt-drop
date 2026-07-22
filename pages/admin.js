import { useState, useEffect } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabaseClient";

const CATEGORIES = [
  { id: "bangers", label: "Bangers" },
  { id: "classiques", label: "Classiques" },
  { id: "kdo", label: "Seconds" },
];

const EMPTY_FORM = {
  brand: "",
  name: "",
  description: "",
  size: "",
  condition: "",
  price: "",
  tag: "",
  category: "bangers",
};

export default function Admin() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");

  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  const [editingId, setEditingId] = useState(null); // null = mode création
  const [form, setForm] = useState(EMPTY_FORM);

  // Photos déjà en ligne (mode édition) — on peut en retirer
  const [existingImages, setExistingImages] = useState([]);
  // Nouvelles photos sélectionnées, pas encore uploadées — on peut en ajouter plusieurs fois
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);

  useEffect(() => {
    if (authed) fetchProducts();
  }, [authed]);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts(data || []);
  }

  function tryLogin(e) {
    e.preventDefault();
    setAuthError("");
    setAuthed(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setExistingImages([]);
    setNewFiles([]);
    setNewPreviews([]);
    setMessage("");
  }

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      brand: product.brand || "",
      name: product.name || "",
      description: product.description || "",
      size: product.size || "",
      condition: product.condition || "",
      price: product.price ?? "",
      tag: product.tag || "",
      category: product.category || "bangers",
    });
    setExistingImages(product.images && product.images.length > 0 ? product.images : (product.image_url ? [product.image_url] : []));
    setNewFiles([]);
    setNewPreviews([]);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Ajoute les fichiers choisis à la liste existante au lieu de la remplacer
  function handleImageChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setNewFiles((prev) => [...prev, ...files]);
    setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    e.target.value = ""; // permet de re-sélectionner un input vide ensuite
  }

  function removeExistingImage(index) {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNewFile(index) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function compressImage(file, maxWidth = 1400, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve({ base64: dataUrl.split(",")[1], type: "image/jpeg" });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Upload les nouvelles photos par petits paquets pour ne jamais dépasser
  // la limite de taille de requête, quel que soit le nombre de photos.
  async function uploadNewFilesInBatches(files, batchSize = 3) {
    const allUrls = [];
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      setUploadProgress(`Envoi des photos ${i + 1} à ${Math.min(i + batchSize, files.length)} sur ${files.length}...`);

      const compressed = await Promise.all(
        batch.map(async (file) => {
          const { base64, type } = await compressImage(file);
          return { imageBase64: base64, imageType: type };
        })
      );

      const res = await fetch("/api/admin-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ images: compressed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur upload");
      allUrls.push(...data.urls);
    }
    return allUrls;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    setUploadProgress("");

    try {
      let newUrls = [];
      if (newFiles.length > 0) {
        newUrls = await uploadNewFilesInBatches(newFiles);
      }
      setUploadProgress("");

      const imageUrls = [...existingImages, ...newUrls];
      const payload = { ...form, price: parseFloat(form.price), imageUrls };

      const res = await fetch("/api/admin-products", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage("Erreur : " + (data.error || "inconnue"));
        if (res.status === 401) setAuthed(false);
      } else {
        setMessage(editingId ? "Pièce modifiée ✓" : "Pièce ajoutée ✓");
        resetForm();
        fetchProducts();
      }
    } catch (err) {
      setMessage("Erreur : " + err.message);
    }
    setSubmitting(false);
    setUploadProgress("");
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
    if (res.ok) {
      if (editingId === id) resetForm();
      fetchProducts();
    }
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold uppercase tracking-tight">
            {editingId ? "Modifier la pièce" : "Ajouter une pièce"}
          </h1>
          {editingId && (
            <button onClick={resetForm} className="text-xs uppercase tracking-widest text-neutral-500 underline">
              Annuler l'édition
            </button>
          )}
        </div>

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
            Photos — tu peux en ajouter plusieurs fois, 3 par 3 si tu veux
          </label>

          {existingImages.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Déjà en ligne</p>
              <div className="flex gap-2 flex-wrap">
                {existingImages.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt="" className="w-20 h-24 object-cover border border-neutral-300" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(i)}
                      className="absolute -top-2 -right-2 bg-neutral-900 text-white text-xs w-5 h-5 rounded-full"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <input type="file" accept="image/*" multiple onChange={handleImageChange} className="text-sm" />

          {newPreviews.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">
                Nouvelles ({newPreviews.length}) — pas encore envoyées
              </p>
              <div className="flex gap-2 flex-wrap">
                {newPreviews.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt="preview" className="w-20 h-24 object-cover border border-pink-400" />
                    <button
                      type="button"
                      onClick={() => removeNewFile(i)}
                      className="absolute -top-2 -right-2 bg-neutral-900 text-white text-xs w-5 h-5 rounded-full"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            disabled={submitting}
            className="mt-2 bg-neutral-900 disabled:bg-neutral-400 text-white text-xs uppercase tracking-widest font-bold py-3"
          >
            {submitting
              ? (uploadProgress || "Envoi en cours...")
              : editingId
                ? "Enregistrer les modifications"
                : "Ajouter la pièce"}
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
                onClick={() => startEdit(p)}
                className="text-neutral-700 text-xs uppercase tracking-widest font-bold px-2"
              >
                Modifier
              </button>
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
