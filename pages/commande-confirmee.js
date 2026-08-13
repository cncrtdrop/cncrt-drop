import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { Check } from "lucide-react";
import { clearCart } from "../lib/cart";

export default function OrderConfirmed() {
  const router = useRouter();
  const { session_id } = router.query;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session_id) return;
    clearCart(); // le panier n'a plus lieu d'être une fois la commande payée

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/order-details?session_id=${session_id}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Impossible de récupérer la commande.");
        } else {
          setOrder(data);
        }
      } catch (err) {
        setError("Erreur réseau.");
      }
      setLoading(false);
    }
    fetchOrder();
  }, [session_id]);

  return (
    <div className="min-h-screen bg-stone-100 text-neutral-900 font-mono flex flex-col items-center px-6 py-16">
      <Head>
        <title>Commande confirmée — CNCRT DROP</title>
      </Head>

      {loading ? (
        <p className="text-sm text-neutral-400">Chargement de ta commande...</p>
      ) : error ? (
        <div className="text-center max-w-sm">
          <p className="text-sm text-neutral-500 mb-4">{error}</p>
          <Link href="/" className="text-xs uppercase tracking-widest underline">Retour au catalogue</Link>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-pink-600 flex items-center justify-center mb-4">
              <Check size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-sans font-bold uppercase tracking-tight">Commande confirmée</h1>
            <p className="text-xs text-neutral-500 mt-1 uppercase tracking-widest">
              Réf. {order.orderNumber}
            </p>
            {order.email && (
              <p className="text-xs text-neutral-500 mt-3">
                Un email de confirmation a été envoyé à {order.email}
              </p>
            )}
          </div>

          <div className="bg-white border border-neutral-200 p-4 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Récapitulatif</h2>
            <div className="flex flex-col gap-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-neutral-700">{item.name}</span>
                  <span className="font-semibold">{item.amount}€</span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-neutral-300 mt-3 pt-3 flex justify-between text-sm font-bold uppercase tracking-widest">
              <span>Total payé</span>
              <span>{order.total}€</span>
            </div>
          </div>

          {order.shippingAddress && (
            <div className="bg-white border border-neutral-200 p-4 mb-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Livraison</h2>
              <p className="text-sm text-neutral-700">
                {order.shippingName}<br />
                {order.shippingAddress.line1}<br />
                {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
                {order.shippingAddress.postal_code} {order.shippingAddress.city}<br />
                {order.shippingAddress.country}
              </p>
            </div>
          )}

          <Link
            href="/"
            className="block text-center border border-neutral-900 text-neutral-900 font-bold uppercase tracking-widest text-xs py-3 hover:bg-pink-600 hover:border-pink-600 hover:text-white transition-colors"
          >
            Retour au catalogue
          </Link>
        </div>
      )}
    </div>
  );
}
