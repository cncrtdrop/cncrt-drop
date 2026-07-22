import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Check, Ruler } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { addToCart as addToCartStorage, isInCart } from "../../lib/cart";

const CATEGORIES = [
  { id: "bangers", label: "Bangers" },
  { id: "classiques", label: "Classiques" },
  { id: "kdo", label: "Seconds" },
];

export default function ProductDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    async function fetchProduct() {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
      if (!error) setProduct(data);
      setLoading(false);
    }
    fetchProduct();
  }, [id]);

  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (product) setAdded(isInCart(product.id));
  }, [product]);

  const addToCart = () => {
    addToCartStorage(product);
    setAdded(true);
  };

  if (loading) {
    return <div className="min-h-screen bg-stone-100 flex items-center justify-center text-neutral-400 font-mono text-sm">Chargement...</div>;
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center gap-4 font-mono text-sm text-neutral-500">
        <p>Pièce introuvable.</p>
        <Link href="/" className="underline">Retour au catalogue</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-neutral-900 font-mono">
      <Head>
        <title>{product.brand} — {product.name} | CNCRT DROP</title>
      </Head>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/"
          className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest mb-6 text-neutral-500 hover:text-pink-700 w-fit"
        >
          <ChevronLeft size={16} /> Retour au catalogue
        </Link>

        <div className="grid sm:grid-cols-2 gap-8 sm:gap-12">
          <div>
            {(() => {
              const images = product.images && product.images.length > 0 ? product.images : [product.image_url];
              const hasMultiple = images.length > 1;
              const next = () => setGalleryIndex((i) => (i + 1) % images.length);
              const prev = () => setGalleryIndex((i) => (i - 1 + images.length) % images.length);
              let touchStartX = 0;
              const onTouchStart = (e) => { touchStartX = e.changedTouches[0].clientX; };
              const onTouchEnd = (e) => {
                const dx = e.changedTouches[0].clientX - touchStartX;
                if (Math.abs(dx) < 40) return;
                dx < 0 ? next() : prev();
              };
              return (
                <>
                  <div
                    className="relative aspect-[4/5] border border-neutral-200 bg-stone-50 overflow-hidden touch-pan-y"
                    onTouchStart={hasMultiple ? onTouchStart : undefined}
                    onTouchEnd={hasMultiple ? onTouchEnd : undefined}
                  >
                    {images[galleryIndex] && (
                      <Image src={images[galleryIndex]} alt={product.name} fill className="object-cover" />
                    )}
                    {product.tag && (
                      <span className="absolute top-2 left-2 bg-white/90 text-neutral-900 text-xs sm:text-sm font-bold uppercase tracking-widest px-2.5 py-1.5">
                        {product.tag}
                      </span>
                    )}
                    {hasMultiple && (
                      <>
                        <button
                          onClick={prev}
                          aria-label="Photo précédente"
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-white/60 text-neutral-900 p-1 opacity-70 hover:opacity-100"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          onClick={next}
                          aria-label="Photo suivante"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-white/60 text-neutral-900 p-1 opacity-70 hover:opacity-100"
                        >
                          <ChevronRight size={14} />
                        </button>
                        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
                          {images.map((_, i) => (
                            <span
                              key={i}
                              className={"w-1.5 h-1.5 rounded-full " + (i === galleryIndex ? "bg-pink-600" : "bg-white/70")}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {hasMultiple && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                      {images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setGalleryIndex(i)}
                          className={
                            "w-14 h-16 border overflow-hidden relative shrink-0 " +
                            (i === galleryIndex ? "border-pink-600" : "border-neutral-200")
                          }
                        >
                          <Image src={img} alt="" fill className="object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className="flex flex-col">
            <span className="w-fit text-xs font-bold uppercase tracking-widest text-pink-700 border border-pink-600/40 px-2.5 py-1 mb-2">
              {CATEGORIES.find((c) => c.id === product.category)?.label}
            </span>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-400">
              <span>{product.brand}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 text-neutral-900">
              {product.name}
            </h1>

            <div className="flex items-center gap-3 text-xs text-neutral-500 mt-3 uppercase tracking-widest">
              <span className="flex items-center gap-1"><Ruler size={12} /> Taille {product.size}</span>
              <span>·</span>
              <span>État {product.condition}</span>
            </div>

            {product.description && (
              <p className="mt-4 text-base text-neutral-600 leading-relaxed">
                {product.description}
              </p>
            )}

            <div className="text-2xl sm:text-3xl font-bold mt-6">{product.price}€</div>
            <p className="text-xs text-neutral-500 mt-1">
              Taxes incluses. Frais d'expédition calculés à l'étape de paiement.
            </p>

            <button
              onClick={addToCart}
              className="mt-4 border border-neutral-900 text-neutral-900 font-bold uppercase tracking-widest text-xs py-3 hover:bg-pink-600 hover:border-pink-600 hover:text-white transition-colors"
            >
              {added ? "Ajouté ✓" : "Ajouter au panier"}
            </button>

            <div className="mt-8 border-t border-dashed border-neutral-300 pt-4 text-xs text-neutral-500 leading-relaxed uppercase tracking-widest">
              <div className="flex items-center gap-1 mb-2"><Check size={12} /> Pièce vérifiée à la main</div>
              <div className="flex items-center gap-1"><Check size={12} /> CB / Apple Pay / Google Pay — zéro frais acheteur</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
