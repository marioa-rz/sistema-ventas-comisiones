'use client';

import React, { useEffect, useState } from 'react';
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

        // Preseleccionar la primera variante disponible para cada producto
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

    // Feedback visual
    setAddedAnimation((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedAnimation((prev) => ({ ...prev, [product.id]: false }));
    }, 1200);
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 via-sakura-500 to-pink-500 text-white p-8 sm:p-12 shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Colección Exclusiva</span>
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Sakura Nails & Beauty
          </h1>
          <p className="text-rose-100 text-sm sm:text-base">
            Descubre nuestra línea de esmaltes, tratamientos y cosméticos. Haz tu pedido en línea sin necesidad de registrarte y compártelo con tu vendedora.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-rose-100">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por producto, tono o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sakura-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sakura-500 focus:border-transparent"
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estados de carga o error */}
      {loading && (
        <div className="text-center py-16 space-y-3">
          <div className="w-10 h-10 border-4 border-sakura-200 border-t-sakura-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Cargando catálogo oficial...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Grid de Productos */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 text-sm">No encontramos productos con los filtros seleccionados.</p>
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
                className="bg-white rounded-xl shadow-sm border border-rose-100 hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Imagen del producto */}
                  <div className="relative aspect-square bg-rose-50/50 flex items-center justify-center overflow-hidden">
                    {product.mainImagePath ? (
                      <img
                        src={product.mainImagePath}
                        alt={product.name}
                        className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Sparkles className="w-12 h-12 text-rose-300 mx-auto mb-2" />
                        <span className="text-xs text-rose-400 font-medium">Sakura Nails</span>
                      </div>
                    )}
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/90 text-sakura-700 backdrop-blur-sm border border-rose-100">
                      {product.category.name}
                    </span>
                  </div>

                  {/* Detalle */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h2 className="font-semibold text-gray-900 line-clamp-1" title={product.name}>
                        {product.name}
                      </h2>
                      {product.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                          {product.description}
                        </p>
                      )}
                    </div>

                    {/* Selector de tonos / variantes */}
                    {product.variants.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
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
                          className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sakura-500"
                        >
                          {product.variants.map((v) => (
                            <option key={v.id} value={v.id} disabled={!v.isAvailable}>
                              {v.name} {!v.isAvailable ? '(Agotado)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Precio y acción */}
                <div className="p-4 pt-0 border-t border-gray-50 mt-2 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 block font-medium">Precio</span>
                    <span className="text-lg font-bold text-gray-900">
                      Q{currentVariant ? parseFloat(currentVariant.price).toFixed(2) : '0.00'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={!currentVariant || !currentVariant.isAvailable}
                    className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                      isAdded
                        ? 'bg-emerald-600 text-white'
                        : !currentVariant || !currentVariant.isAvailable
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-sakura-600 hover:bg-sakura-700 text-white active:scale-95'
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
