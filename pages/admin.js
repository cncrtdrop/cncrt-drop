import { useState, useEffect } from "react";
import Head from "next/head";
import { GripVertical } from "lucide-react";
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
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setProducts(data || []);
  }

  async function persistOrder(categoryId, orderedList) {
    await Promise.all(
      orderedList.map((p, i) =>
        fetch("/api/admin-products", {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-admin-password": password },
          body: JSON.stringify({ id: p.id, sort_order: i * 10 }),
        })
      )
    );
    fetchProducts();
  }

  async function moveProduct(product, direction) {
    const sameCategory = products
      .filter((p) => p.category === product.category)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || new Date(b.created_at) - new Date(a.created_at));

    const index = sameCategory.findIndex((p) => p.id === product.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sameCategory.length) return;

    const reordered = [...sameCategory];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(swapIndex, 0, moved);
    persistOrder(product.category, reordered);
  }

  // --- Glisser-déposer tactile pour réordonner ---
  const [dragId, setDragId] = useState(null);
  const [dragCategory, setDragCategory] = useState(null);
  const [localOrder, setLocalOrder] = useState(null); // aperçu pendant le glisser

  function startDrag(product) {
    setDragId(product.id);
    setDragCategory(product.category);
    const items = products
      .filter((p) => p.category === product.category)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || new Date(b.created_at) - new Date(a.created_at));
    setLocalOrder(items);
  }

  function handlePointerMove(clientX, clientY) {
    if (!dragId || !localOrder) return;
    const el = document.elementFromPoint(clientX, clientY);
    const row = el && el.closest("[data-product-row]");
    if (!row) return;
    const overId = row.getAttribute("data-product-row");
    if (overId === dragId) return;
    const overIndex = localOrder.findIndex((p) => p.id === overId);
    const dragIndex = localOrder.findIndex((p) => p.id === dragId);
    if (overIndex === -1 || dragIndex === -1) return;
    const next = [...localOrder];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(overIndex, 0, moved);
    setLocalOrder(next);
  }

  function endDrag() {
    if (dragId && dragCategory && localOrder) {
      persistOrder(dragCategory, localOrder);
    }
    setDragId(null);
    setDragCategory(null);
    setLocalOrder(null);
  }

  useEffect(() => {
    if (!dragId) return;
    const onMove = (e) => {
      const point = e.touches ? e.touches[0] : e;
      handlePointerMove(point.clientX, point.clientY);
    };
    const onUp = () => endDrag();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragId, localOrder]);

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

  async function submitProduct(publishedValue) {
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
      const payload = { ...form, price: parseFloat(form.price), imageUrls, published: publishedValue };

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
        setMessage(
          publishedValue
            ? (editingId ? "Pièce modifiée et publiée ✓" : "Pièce publiée ✓")
            : "Enregistré en brouillon ✓ — pas encore visible sur le site"
        );
        resetForm();
        fetchProducts();
      }
    } catch (err) {
      setMessage("Erreur : " + err.message);
    }
    setSubmitting(false);
    setUploadProgress("");
  }

  async function togglePublished(product) {
    await fetch("/api/admin-products", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ id: product.id, published: !product.published }),
    });
    fetchProducts();
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

        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3 bg-white border border-neutral-200 p-5 mb-10">
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
              className="border border-neutral-300 px-3 py-2 text-sm flex-1 min-w-0"
            />
            <input
              required
              placeholder="État (9/10...)"
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              className="border border-neutral-300 px-3 py-2 text-sm flex-1 min-w-0"
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
              className="border border-neutral-300 px-3 py-2 text-sm flex-1 min-w-0"
            />
            <input
              placeholder="Tag (RARE, NEW, DROP 03...)"
              value={form.tag}
              onChange={(e) => setForm({ ...form, tag: e.target.value })}
              className="border border-neutral-300 px-3 py-2 text-sm flex-1 min-w-0"
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

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => submitProduct(true)}
              className="flex-1 bg-neutral-900 disabled:bg-neutral-400 text-white text-xs uppercase tracking-widest font-bold py-3"
            >
              {submitting
                ? (uploadProgress || "Envoi en cours...")
                : editingId
                  ? "Enregistrer et publier"
                  : "Publier"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => submitProduct(false)}
              className="flex-1 border border-neutral-900 disabled:border-neutral-300 disabled:text-neutral-400 text-neutral-900 text-xs uppercase tracking-widest font-bold py-3"
            >
              Enregistrer en brouillon
            </button>
          </div>
          {message && <p className="text-xs text-neutral-600">{message}</p>}
        </form>

        <h2 className="text-sm font-bold uppercase tracking-tight mb-1">Pièces en ligne ({products.length})</h2>
        <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-4">
          Maintiens la poignée ⠿ et glisse pour changer l'ordre d'affichage dans chaque catégorie
        </p>

        {CATEGORIES.map((cat) => {
          const baseItems = products
            .filter((p) => p.category === cat.id)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || new Date(b.created_at) - new Date(a.created_at));

          // Pendant un glisser en cours sur cette catégorie, on affiche l'ordre en aperçu
          const items = dragCategory === cat.id && localOrder ? localOrder : baseItems;

          if (items.length === 0) return null;

          return (
            <div key={cat.id} className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-pink-600 mb-2">{cat.label}</h3>
              <div className="flex flex-col gap-2">
                {items.map((p, i) => (
                  <div
                    key={p.id}
                    data-product-row={p.id}
                    className={
                      "flex flex-wrap items-center gap-x-3 gap-y-2 bg-white border p-2 " +
                      (dragId === p.id ? "opacity-50 " : "") +
                      (p.published ? "border-neutral-200" : "border-dashed border-neutral-300")
                    }
                  >
                    <button
                      onPointerDown={() => startDrag(p)}
                      onTouchStart={() => startDrag(p)}
                      className="text-neutral-400 hover:text-pink-600 cursor-grab active:cursor-grabbing touch-none"
                      aria-label="Glisser pour réordonner"
                    >
                      <GripVertical size={18} />
                    </button>

                    {p.image_url && (
                      <img src={p.image_url} alt={p.name} className="w-12 h-14 object-cover border border-neutral-200 shrink-0" />
                    )}

                    <div className="flex-1 min-w-[120px] text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold uppercase tracking-widest text-[10px] text-neutral-400">{p.brand}</span>
                        {!p.published && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-pink-600 border border-pink-600/40 px-1 shrink-0">
                            Brouillon
                          </span>
                        )}
                      </div>
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className="text-neutral-500">{p.price}€</div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] sm:text-xs shrink-0">
                      <button
                        onClick={() => togglePublished(p)}
                        className="text-neutral-700 uppercase tracking-widest font-bold px-1"
                      >
                        {p.published ? "Dépublier" : "Publier"}
                      </button>
                      <button
                        onClick={() => startEdit(p)}
                        className="text-neutral-700 uppercase tracking-widest font-bold px-1"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-pink-600 uppercase tracking-widest font-bold px-1"
                      >
                        Suppr.
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
