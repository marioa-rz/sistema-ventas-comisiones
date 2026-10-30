'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { normalizeCartQuantity, parseStoredCart, type CartItem } from './cart-storage';

export type { CartItem } from './cart-storage';

interface CartContextType {
  items: CartItem[];
  isInitialized: boolean;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  totalEstimated: number;
  totalItemsCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'sakura_cart_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(parseStoredCart(stored));
      }
    } catch {
      // Ignorar errores de parsing
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isInitialized]);

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems((prev) => {
      const index = prev.findIndex((i) => i.variantId === item.variantId);
      if (index >= 0) {
        const copy = [...prev];
        const existing = copy[index];
        if (existing) {
          copy[index] = {
            ...existing,
            quantity: normalizeCartQuantity(existing.quantity + quantity),
          };
        }
        return copy;
      }
      return [...prev, { ...item, quantity: normalizeCartQuantity(quantity) }];
    });
  };

  const removeItem = (variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(variantId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.variantId === variantId ? { ...i, quantity: normalizeCartQuantity(quantity) } : i)),
    );
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const totalEstimated = items.reduce((acc, item) => {
    const p = parseFloat(item.price) || 0;
    return acc + p * item.quantity;
  }, 0);

  const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isInitialized,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalEstimated,
        totalItemsCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
