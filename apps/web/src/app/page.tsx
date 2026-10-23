'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Search, ShoppingBag, Check, Sparkles, Filter } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useCart } from '../lib/cart-context';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  price: string;
  imagePath: string | null;
  isAvailable: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  mainImagePath: string | null;
  category: { id: string; name: string };
  variants: ProductVariant[];
}

export default function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados locales para variante seleccionada por producto
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [addedAnimation, setAddedAnimation] = useState<Record<string, boolean>>({});

  const { addItem } = useCart();

  useEffect(() => {
    const loadCatalog = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cats, prods] = await Promise.all([
          apiClient<Category[]>('categories'),
          apiClient<Product[]>('products'),
        ]);
        setCategories(cats);
        setProducts(prods);

        const initialVariants: Record<string, string> = {};
        for (const p of prods) {
          const firstAvailable = p.variants.find((v) => v.isAvailable) || p.variants[0];
          if (firstAvailable) {
            initialVariants[p.id] = firstAvailable.id;
          }
        }
        setSelectedVariants(initialVariants);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el catálogo de productos');
      } finally {
        setLoading(false);
      }
    };

    void loadCatalog();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory ? p.category.id === selectedCategory : true;
    const matchesSearch = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.variants.some((v) => v.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (product: Product) => {
    const variantId = selectedVariants[product.id];
    const variant = product.variants.find((v) => v.id === variantId) || product.variants[0];
    if (!variant || !variant.isAvailable) return;

    addItem({
      variantId: variant.id,
      sku: variant.sku,
      productName: product.name,
      variantName: variant.name,
      price: variant.price,
      imagePath: variant.imagePath || product.mainImagePath,
    });

    setAddedAnimation((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedAnimation((prev) => ({ ...prev, [product.id]: false }));
    }, 1200);
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner Dark con estilo Sakura Beauty */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1A0B14] via-[#0D0A0C] to-[#120810] border border-[rgba(255,45,155,0.3)] text-white p-8 sm:p-12 shadow-[0_0_35px_rgba(255,45,155,0.15)]">
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[rgba(255,45,155,0.15)] border border-[rgba(255,45,155,0.35)] text-sakura text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Colección Oficial</span>
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            Sakura <span className="text-sakura">Beauty</span>
          </h1>
          <p className="text-[#C2B6BC] text-sm sm:text-base leading-relaxed">
            Descubre nuestra línea de esmaltes, tratamientos y cosméticos. Haz tu pedido en línea sin necesidad de registrarte y compártelo con tu vendedora.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-[rgba(255,45,155,0.18)] rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-[#0D0A0C] p-4 rounded-xl border border-[rgba(255,45,155,0.2)] shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por producto, tono o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#131014] text-[#F8F0F5] placeholder-[#96878F] text-sm focus:outline-none focus:border-sakura focus:ring-1 focus:ring-sakura transition-all"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-sakura" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-sm bg-[#131014] text-[#F8F0F5] focus:outline-none focus:border-sakura focus:ring-1 focus:ring-sakura"
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id} className="bg-[#131014] text-[#F8F0F5]">
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estados de carga o error */}
      {loading && (
        <div className="text-center py-16 space-y-3">
          <div className="w-10 h-10 border-4 border-[rgba(255,45,155,0.2)] border-t-sakura rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(255,45,155,0.5)]" />
          <p className="text-sm text-[#A09098]">Cargando catálogo oficial...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-950/40 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Grid de Productos */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="text-center py-16 bg-[#0D0A0C] rounded-xl border border-dashed border-[rgba(255,255,255,0.1)]">
          <p className="text-[#96878F] text-sm">No encontramos productos con los filtros seleccionados.</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const currentVariantId = selectedVariants[product.id] || product.variants[0]?.id;
            const currentVariant = product.variants.find((v) => v.id === currentVariantId) || product.variants[0];
            const isAdded = addedAnimation[product.id];

            return (
              <div
                key={product.id}
                className="bg-[#0D0A0C] rounded-xl border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,45,155,0.4)] transition-all overflow-hidden flex flex-col justify-between group hover:shadow-[0_0_20px_rgba(255,45,155,0.15)]"
              >
                <div>
                  {/* Imagen del producto */}
                  <div className="relative aspect-square bg-[#131014] flex items-center justify-center overflow-hidden">
                    {product.mainImagePath ? (
                      <img
                        src={product.mainImagePath}
                        alt={product.name}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <div className="relative w-16 h-16 mx-auto mb-2 opacity-70 group-hover:opacity-100 transition-opacity">
                          <Image src="/sakura-logo.png" alt="Sakura" fill className="object-contain" />
                        </div>
                        <span className="text-xs text-sakura font-semibold">Sakura Beauty</span>
                      </div>
                    )}
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#080608]/85 text-[#F8F0F5] backdrop-blur-sm border border-[rgba(255,45,155,0.3)]">
                      {product.category.name}
                    </span>
                  </div>

                  {/* Detalle */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h2 className="font-bold text-[#F8F0F5] line-clamp-1 group-hover:text-sakura transition-colors" title={product.name}>
                        {product.name}
                      </h2>
                      {product.description && (
                        <p className="text-xs text-[#96878F] line-clamp-2 mt-1">
                          {product.description}
                        </p>
                      )}
                    </div>

                    {/* Selector de tonos / variantes */}
                    {product.variants.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#A09098] uppercase tracking-wider block">
                          Tono / Variante
                        </label>
                        <select
                          value={currentVariantId}
                          onChange={(e) =>
                            setSelectedVariants((prev) => ({
                              ...prev,
                              [product.id]: e.target.value,
                            }))
                          }
                          className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#131014] text-[#F8F0F5] focus:outline-none focus:border-sakura"
                        >
                          {product.variants.map((v) => (
                            <option key={v.id} value={v.id} disabled={!v.isAvailable} className="bg-[#131014]">
                              {v.name} {!v.isAvailable ? '(Agotado)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Precio y acción */}
                <div className="p-4 pt-0 border-t border-[rgba(255,255,255,0.05)] mt-2 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#96878F] block font-semibold uppercase">Precio</span>
                    <span className="text-lg font-black text-white">
                      Q{currentVariant ? parseFloat(currentVariant.price).toFixed(2) : '0.00'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={!currentVariant || !currentVariant.isAvailable}
                    className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
                      isAdded
                        ? 'bg-emerald-600 text-white'
                        : !currentVariant || !currentVariant.isAvailable
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-sakura hover:bg-sakura-glow text-white active:scale-95 shadow-[0_0_15px_rgba(255,45,155,0.3)]'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Agregado</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Agregar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
