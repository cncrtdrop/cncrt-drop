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
  const alreadyIn = cart.some((item) => item.id === product.id);
  if (!alreadyIn) {
    cart.push(product);
    saveCart(cart);
  }
  return { cart: alreadyIn ? cart : getCart(), added: !alreadyIn };
}

export function isInCart(productId) {
  return getCart().some((item) => item.id === productId);
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
