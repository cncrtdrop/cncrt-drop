import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, X, Check, Ruler, Search, Info, ChevronLeft } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { getCart, addToCart as addToCartStorage, removeFromCart as removeFromCartStorage, clearCart } from "../lib/cart";

const CATEGORIES = [
  { id: "bangers", label: "Bangers", description: "Des pièces rares, limitées, 90s, ou tout simplement qu'on adore." },
  { id: "classiques", label: "Classiques", description: "Simple et efficaces, du classique de seconde main." },
  { id: "kdo", label: "Seconds", description: "Des pièces avec des défauts, des prix qui n'en ont pas." },
];

export default function Home() {
  const [unlocked, setUnlocked] = useState(false);
  const [picking, setPicking] = useState(false);
  const [siteVisible, setSiteVisible] = useState(false);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("bangers");

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("published", true)
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (!error) setProducts(data || []);
      setLoading(false);
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    setCart(getCart());
    const handler = () => setCart(getCart());
    window.addEventListener("cncrt-cart-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("cncrt-cart-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem("cncrt_gate_passed") === "true") {
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (unlocked) {
      const t = setTimeout(() => setSiteVisible(true), 30);
      return () => clearTimeout(t);
    }
  }, [unlocked]);

  const handlePick = () => {
    if (picking) return;
    setPicking(true);
    setTimeout(() => {
      setUnlocked(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("cncrt_gate_passed", "true");
      }
    }, 650);
  };

  const addToCart = (product) => {
    const { cart: newCart } = addToCartStorage(product);
    setCart(newCart);
    setCartOpen(true);
  };

  const removeFromCart = (index) => {
    setCart(removeFromCartStorage(index));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      clearCart();
      setCart([]);
    }
  }, []);

  const total = cart.reduce((sum, item) => sum + Number(item.price), 0);

  const normalize = (str) =>
    (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const [sortOption, setSortOption] = useState("default");

  function applySort(list) {
    if (sortOption === "recent") {
      return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    if (sortOption === "price_asc") {
      return [...list].sort((a, b) => Number(a.price) - Number(b.price));
    }
    if (sortOption === "price_desc") {
      return [...list].sort((a, b) => Number(b.price) - Number(a.price));
    }
    return list; // "default" = ordre défini dans l'admin
  }

  const filteredProducts = applySort(products.filter((p) => p.category === activeCategory));

  const searchResults = searchQuery.trim()
    ? products.filter((p) => normalize(p.brand + " " + p.name).includes(normalize(searchQuery)))
    : [];

  const isSearching = searchQuery.trim().length > 0;

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      const items = cart.map((item) => ({
        name: item.name,
        brand: item.brand,
        price: item.price,
        image_url: item.image_url,
        quantity: 1,
      }));
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erreur au paiement : " + (data.error || "inconnue"));
      }
    } catch (err) {
      alert("Erreur au paiement.");
    }
    setCheckingOut(false);
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen text-stone-100 flex flex-col items-center justify-end relative overflow-hidden font-mono">
        <Head>
          <title>CNCRT DROP</title>
        </Head>

        <button
          onClick={handlePick}
          aria-label="Attrape un t-shirt"
          className={
            "absolute inset-0 w-full h-full cursor-pointer transition-opacity ease-out " +
            (picking ? "opacity-0 duration-700" : "duration-300")
          }
        >
          <Image src="/gate-bg.jpg" alt="" fill className="object-contain bg-neutral-950" />
        </button>

        <p
          className="relative z-10 mb-10 sm:mb-14 text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-stone-100 pointer-events-none"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}
        >
          Attrape un t-shirt
        </p>
      </div>
    );
  }

  return (
    <div className={"transition-opacity duration-700 " + (siteVisible ? "opacity-100" : "opacity-0")}>
      <Head>
        <title>CNCRT DROP — Curated for the streets</title>
      </Head>

      <div className="min-h-screen bg-stone-100 text-neutral-900 font-mono">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-stone-100/95 backdrop-blur border-b border-neutral-300">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="CNCRT DROP" width={140} height={70} className="h-9 sm:h-11 w-auto" />
              <div className="text-[9px] sm:text-[10px] tracking-[0.2em] text-neutral-500 uppercase leading-tight hidden sm:block">
                Secondhand<br />streetwear
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowAbout(true); }}
                className="hidden sm:flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-neutral-500 hover:text-neutral-900 px-2"
              >
                <Info size={14} /> L'esprit CNCRT
              </button>
              <button
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Rechercher"
                className="border border-neutral-900 p-2 hover:bg-neutral-900 hover:text-stone-100 transition-colors"
              >
                <Search size={15} />
              </button>
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex items-center gap-2 border border-neutral-900 px-3 py-2 sm:px-4 sm:py-2 uppercase text-[10px] sm:text-xs tracking-widest font-bold hover:bg-neutral-900 hover:text-stone-100 transition-colors"
              >
                <ShoppingBag size={15} />
                <span className="hidden sm:inline">Panier</span>
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-pink-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {searchOpen && (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-3">
              <div className="flex items-center gap-2 border border-neutral-900 px-3 py-2">
                <Search size={14} className="text-neutral-400" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Chercher une marque, une pièce..."
                  className="flex-1 bg-transparent outline-none text-sm"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-neutral-400 hover:text-neutral-900">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </header>

        {showAbout ? (
          <AboutPage onBack={() => setShowAbout(false)} />
        ) : (
        <>
        {/* Hero */}
        <section className="relative bg-neutral-950 text-stone-100 border-b border-neutral-800">
          <div className="relative w-full aspect-[4/5] max-w-md mx-auto sm:max-w-none">
            <Image src="/hero.jpg" alt="CNCRT DROP" fill className="object-cover" />

            <div className="absolute inset-x-0 bottom-0 px-5 sm:px-8 pb-10 sm:pb-10 max-w-2xl">
              <h1 className="font-sans-display font-black uppercase leading-[0.95] tracking-tight text-3xl sm:text-5xl md:text-6xl max-w-2xl">
                Quand les roses poussent
                <span className="block text-pink-500">au milieu du béton.</span>
              </h1>

              <p className="mt-5 text-neutral-300 max-w-md text-sm sm:text-base leading-relaxed font-sans-display">
                Des pièces cueillies à la main, pour leur style et leur qualité.{" "}
                <span className="font-semibold text-neutral-100">
                  Le vêtement le plus responsable est celui qu'on ne fabrique pas.
                </span>
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-[10px] sm:text-xs uppercase tracking-widest">
                <span className="border border-dashed border-neutral-700 text-neutral-400 px-2 py-1 flex items-center gap-1">
                  <Check size={12} /> CB
                </span>
                <span className="border border-dashed border-neutral-700 text-neutral-400 px-2 py-1 flex items-center gap-1">
                  <Check size={12} /> Apple Pay
                </span>
                <span className="border border-dashed border-neutral-700 text-neutral-400 px-2 py-1 flex items-center gap-1">
                  <Check size={12} /> Google Pay
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Nouveau Drop */}
        <section className="border-b border-neutral-300 bg-white">
          <div className="max-w-5xl mx-auto pt-6 pb-4">
            <div className="flex items-baseline justify-between px-4 sm:px-6 mb-3">
              <h2 className="text-sm sm:text-base font-sans-display font-bold uppercase tracking-widest">
                Nouveau <span className="text-pink-600">Drop</span>
              </h2>
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest">
                Glisse pour voir plus →
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 sm:px-6 pb-2" style={{ scrollbarWidth: "none" }}>
              {products.slice(0, 10).map((p) => (
                <Link key={p.id} href={`/product/${p.id}`} className="shrink-0 w-28 sm:w-32 text-left">
                  <div className="relative aspect-[4/5] bg-stone-100 border border-neutral-200 overflow-hidden">
                    {p.image_url && <Image src={p.image_url} alt={p.name} fill className="object-cover" />}
                    {p.tag && (
                      <span className="absolute top-1 left-1 bg-white/90 text-neutral-900 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5">
                        {p.tag}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 text-[9px] font-bold uppercase tracking-widest text-neutral-400 truncate">
                    {p.brand}
                  </div>
                  <div className="text-[11px] font-semibold text-neutral-900 truncate">{p.price}€</div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Catalog */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-base sm:text-lg font-sans-display font-bold tracking-tight">
              {isSearching ? `Résultats pour "${searchQuery}"` : "Notre catalogue"}
            </h2>
            <span className="text-[10px] sm:text-xs text-neutral-500 uppercase tracking-widest">
              {isSearching ? `${searchResults.length} pièces` : `${products.length} pièces au total`}
            </span>
          </div>

          {!isSearching && (
            <>
              <div className="flex gap-6 border-b border-dashed border-neutral-300 mb-2">
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={
                        "pb-3 text-[11px] sm:text-xs font-bold uppercase tracking-widest border-b-2 -mb-px transition-colors " +
                        (isActive
                          ? "border-pink-600 text-neutral-900"
                          : "border-transparent text-neutral-400 hover:text-neutral-600")
                      }
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-4 mb-6">
                <p className="text-sm text-neutral-500 italic">
                  {CATEGORIES.find((c) => c.id === activeCategory)?.description}
                </p>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="text-[10px] sm:text-xs uppercase tracking-widest border border-neutral-300 px-2 py-1.5 bg-white shrink-0"
                >
                  <option value="default">Notre sélection</option>
                  <option value="recent">Plus récent</option>
                  <option value="price_asc">Prix croissant</option>
                  <option value="price_desc">Prix décroissant</option>
                </select>
              </div>
            </>
          )}

          {isSearching && searchResults.length === 0 && (
            <p className="text-sm text-neutral-500 mb-6">Aucune pièce ne correspond à "{searchQuery}".</p>
          )}

          {loading ? (
            <p className="text-sm text-neutral-400">Chargement...</p>
          ) : (isSearching ? searchResults : filteredProducts).length === 0 && !isSearching ? (
            <p className="text-sm text-neutral-400">Pas encore de pièces dans cette catégorie.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
              {(isSearching ? searchResults : filteredProducts).map((p) => (
                <Link key={p.id} href={`/product/${p.id}`}>
                  <div className="bg-white border border-neutral-200 flex flex-col cursor-pointer hover:border-neutral-900 transition-colors">
                    <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
                      {p.image_url && (
                        <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                      )}
                      {p.tag && (
                        <span className="absolute top-2 left-2 bg-white/90 text-neutral-900 text-xs font-bold uppercase tracking-widest px-2.5 py-1.5">
                          {p.tag}
                        </span>
                      )}
                    </div>
                    <div className="p-3 flex flex-col gap-1 flex-1">
                      <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400">
                        {p.brand}
                      </div>
                      <div className="text-xs sm:text-sm font-sans-display font-semibold leading-tight text-neutral-900">
                        {p.name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-neutral-500 mt-1">
                        <span className="flex items-center gap-1"><Ruler size={10} /> {p.size}</span>
                        <span>·</span>
                        <span>{p.condition}</span>
                      </div>
                      <div className="mt-auto pt-3 flex items-center justify-between">
                        <span className="text-sm sm:text-base font-sans-display font-bold">{p.price}€</span>
                        {cart.some((c) => c.id === p.id) ? (
                          <span className="text-neutral-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest px-2 py-1.5 sm:px-3 sm:py-2">
                            Dans le panier
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              addToCart(p);
                            }}
                            className="border border-neutral-900 text-neutral-900 text-[10px] sm:text-xs font-bold uppercase tracking-widest px-2 py-1.5 sm:px-3 sm:py-2 hover:bg-pink-600 hover:border-pink-600 hover:text-white transition-colors"
                          >
                            Ajouter
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="border-t border-dashed border-neutral-300 bg-stone-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center">
            <button
              onClick={() => setShowAbout(true)}
              className="text-[10px] uppercase tracking-widest font-bold text-pink-600 hover:underline"
            >
              L'esprit CNCRT →
            </button>
          </div>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 border-t border-dashed border-neutral-300 text-[10px] sm:text-xs uppercase tracking-widest flex flex-col sm:flex-row justify-between gap-3 text-neutral-500">
            <span>CNCRT DROP · Réf. Manifest-03</span>
            <span>Paiement sécurisé via Stripe — CB, Apple Pay, Google Pay</span>
          </div>
        </footer>
        </>
        )}

        {/* Cart drawer */}
        {cartOpen && (
          <div className="fixed inset-0 z-40 flex justify-end">
            <div className="absolute inset-0 bg-neutral-900/60" onClick={() => setCartOpen(false)} />
            <div className="relative w-full max-w-sm bg-white h-full border-l border-neutral-300 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-neutral-300">
                <span className="font-sans-display font-bold tracking-tight">Ton panier</span>
                <button onClick={() => setCartOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {cart.length === 0 ? (
                  <p className="text-sm text-neutral-500">Panier vide pour l'instant.</p>
                ) : (
                  cart.map((item, i) => (
                    <Link
                      key={i}
                      href={`/product/${item.id}`}
                      onClick={() => setCartOpen(false)}
                      className="flex items-center gap-3 bg-stone-50 border border-neutral-200 p-2 hover:border-pink-600 transition-colors"
                    >
                      {item.image_url && (
                        <img src={item.image_url} alt={item.name} className="w-12 h-14 object-cover border border-neutral-200" />
                      )}
                      <div className="flex-1 text-xs">
                        <div className="font-bold uppercase tracking-widest text-[10px] text-neutral-400">{item.brand}</div>
                        <div className="font-semibold font-sans-display">{item.name}</div>
                        <div className="text-neutral-500">{item.size} · {item.price}€</div>
                      </div>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFromCart(i); }}
                        className="text-neutral-400 hover:text-pink-600"
                      >
                        <X size={16} />
                      </button>
                    </Link>
                  ))
                )}
              </div>

              <div className="border-t border-neutral-300 p-4">
                <div className="flex justify-between text-sm font-sans-display font-bold uppercase tracking-widest mb-3">
                  <span>Total</span>
                  <span>{total}€</span>
                </div>
                <button
                  disabled={cart.length === 0 || checkingOut}
                  onClick={handleCheckout}
                  className="w-full bg-pink-600 disabled:bg-neutral-300 disabled:text-neutral-500 text-white font-bold uppercase tracking-widest text-xs py-3"
                >
                  {checkingOut ? "Redirection..." : "Payer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AboutPage({ onBack }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest mb-8 text-neutral-500 hover:text-pink-700"
      >
        <ChevronLeft size={16} /> Retour au catalogue
      </button>

      <div className="text-[10px] uppercase tracking-[0.2em] text-pink-600 font-bold mb-3">Manifeste</div>

      <h1 className="font-sans-display font-black uppercase leading-[0.95] tracking-tight text-3xl sm:text-4xl mb-8 max-w-xl">
        Quand les roses poussent
        <span className="block text-pink-600">au milieu du béton.</span>
      </h1>

      <div className="flex flex-col gap-6 text-sm sm:text-base text-neutral-700 leading-relaxed max-w-xl font-sans-display">
        <p>Acheter des vêtements de seconde main c'est :</p>

        <div>
          <h2 className="font-bold uppercase tracking-widest text-xs text-neutral-900 mb-2">Des pièces uniques</h2>
          <p>
            Retrouver des pièces uniques qui ne sont plus produites. La plupart des
            modèles proposés ne sont plus trouvables sur le marché du neuf, certaines
            pièces sont des vêtements qui ont marqué des générations, ou des collectors
            produits en faibles quantités par les marques. Quelques trésors qui
            resurgissent sous nos yeux. Une manière unique de se démarquer et d'adopter
            un style qui ne ressemble qu'à vous !
          </p>
        </div>

        <div>
          <h2 className="font-bold uppercase tracking-widest text-xs text-neutral-900 mb-2">Un choix de bon sens</h2>
          <p>
            Sans rentrer dans une diatribe écologique moralisatrice, la production
            mondiale de vêtements est une folie. Des quantités pouvant habiller
            plusieurs générations, un gaspillage à vomir, et des conditions de
            production qui bafouent les droits humains les plus élémentaires. Acheter
            des vêtements déjà produits c'est tout simplement refuser de participer à
            ce non-sens humain et écologique. Le vêtement le plus responsable est
            celui qu'on ne produit pas.
          </p>
        </div>

        <div>
          <h2 className="font-bold uppercase tracking-widest text-xs text-neutral-900 mb-2">Des marques accessibles</h2>
          <p>
            Des vêtements de marques à prix abordables ! Pour nos générations, porter
            des marques est important. Très important même. Soyons honnêtes. Nous
            devons travailler là-dessus, mais en attendant il faut bien nourrir nos
            ego capitalistes et narcissiques. La seconde main permet d'accéder à une
            sélection de vêtements de marque de qualité tout en les rendant
            accessibles à tous. Nos prix sont évidemment plus chers que ce que vous
            trouverez en vide-grenier ou en ressourcerie, mais nous nous efforçons
            quand même de garder des prix accessibles pour la majorité de nos pièces.
          </p>
        </div>

        <div>
          <h2 className="font-bold uppercase tracking-widest text-xs text-neutral-900 mb-2">Les emballages chez CNCRT</h2>
          <p>
            C'est assez simple, on ne va pas s'amuser à aller acheter des cartons
            neufs (ou recyclés) qui créeront des déchets supplémentaires alors qu'on
            s'efforce de lutter contre ça niveau vêtements. Essayons de rester
            cohérents. Vos vêtements arrivent donc dans des cartons eux aussi de
            seconde main ! Et ça permet en plus de ne pas avoir de coûts
            supplémentaires ! Quelle idée incroyable.
          </p>
        </div>

        <div>
          <h2 className="font-bold uppercase tracking-widest text-xs text-neutral-900 mb-2">Les prix</h2>
          <p>
            Sujet épineux. Qui dit vêtement de seconde main dit coût d'achat assez
            bas pour nous. Entre 50c et 5 euros pour la majorité des pièces. On se
            fait parfois plaisir quand on veut proposer une pièce vraiment unique,
            mais ça reste assez rare. Pas de grossiste ici (on vous parlera peut-être
            un jour de cette problématique) mais des vêtements chinés les dimanches
            en vide-grenier, en ressourcerie, récupérés sur Vinted etc. Vous pouvez
            donc vous aussi trouver ce genre de pièce à des prix bas. Ce n'est pas un
            secret et on vous encourage à le faire ! Notre plus-value reste de
            sélectionner ces pièces, tant au niveau du style que de la qualité. Les
            remettre en état quand on peut. C'est beaucoup de temps et d'énergie ! On
            essaie donc de naviguer entre nos prix d'achat et l'investissement qu'on
            met derrière. Les charges aussi. Ça donne les prix que vous voyez sur le
            site. On trouve ça honnête, on espère que vous aussi !
          </p>
        </div>

        <div>
          <h2 className="font-bold uppercase tracking-widest text-xs text-neutral-900 mb-2">Les notes d'état</h2>
          <p>
            Toujours difficile, car il y a une part de subjectivité, mais ça nous
            semblait important. 10/10 correspond à un vêtement neuf, 0/10 à un
            vêtement que vous ne donneriez même pas à votre pire ennemi. 8 et 9 sont
            des vêtements sans imperfections, presque comme neufs. 5 à 7 des
            vêtements avec de légers défauts (toujours indiqués en photos) ou une
            usure plus prononcée. Des vêtements portés régulièrement mais toujours
            en bon état ! En dessous de 5, les défauts sont plus importants ou plus
            visibles. Là encore toujours spécifiés en photo ou dans la description.
            Une légère décoloration, un bouton qui manque, une couture qui commence
            à faiblir etc. Mais des vêtements qui restent portables sans soucis. Et
            pas chers en plus ! Mais s'il vous plaît, n'oubliez jamais que ce sont
            des vêtements d'occasion. Ils arrivent chez vous propres et emballés
            avec amour, mais ce n'est pas du neuf. Alors acceptons quelques légères
            imperfections, c'est souvent elles qui rendent la vie plus belle !
            (Sûrement un proverbe mis en avant par les pauvres hein)
          </p>
        </div>
      </div>
    </div>
  );
}
