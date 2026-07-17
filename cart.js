const CART_KEY = "cncrt_cart";

export function getCart() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("cncrt-cart-updated"));
}

export function addToCart(product) {
  const cart = getCart();
  cart.push(product);
  saveCart(cart);
  return cart;
}

export function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  return cart;
}

export function clearCart() {
  saveCart([]);
}
