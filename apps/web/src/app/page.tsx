'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  Check,
  Heart,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { useCart } from '../lib/cart-context';
import {
  filterAndSortProducts,
  loadAllCatalogProducts,
  type Product,
  type SortOption,
} from './catalog-view-model';

interface Category {
  id: string;
  name: string;
  slug: string;
}

const trustItems = [
  { icon: Truck, title: 'Envíos a toda Guatemala', detail: 'Coordina la entrega con tu vendedora' },
  { icon: PackageCheck, title: 'Productos seleccionados', detail: 'Catálogo actualizado por Sakura Makeup' },
  { icon: ShieldCheck, title: 'Compra segura', detail: 'Totales confirmados por nuestro sistema' },
];

export default function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
          loadAllCatalogProducts((limit, offset) =>
            apiClient<Product[]>(`products?limit=${limit}&offset=${offset}`),
          ),
        ]);
        setCategories(cats);
        setProducts(prods);

        const initialVariants: Record<string, string> = {};
        for (const product of prods) {
          const firstAvailable = product.variants.find((variant) => variant.isAvailable) ?? product.variants[0];
          if (firstAvailable) initialVariants[product.id] = firstAvailable.id;
        }
        setSelectedVariants(initialVariants);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'No pudimos cargar el catálogo.');
      } finally {
        setLoading(false);
      }
    };

    void loadCatalog();
  }, []);

  const visibleProducts = useMemo(() => {
    return filterAndSortProducts(products, { searchQuery, selectedCategory, sortBy });
  }, [products, searchQuery, selectedCategory, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSortBy('featured');
  };

  const handleAddToCart = (product: Product) => {
    const variantId = selectedVariants[product.id];
    const variant = product.variants.find((item) => item.id === variantId) ?? product.variants[0];
    if (!variant?.isAvailable) return;

    addItem({
      variantId: variant.id,
      sku: variant.sku,
      productName: product.name,
      variantName: variant.name,
      price: variant.price,
      imagePath: variant.imagePath ?? product.mainImagePath,
    });

    setAddedAnimation((current) => ({ ...current, [product.id]: true }));
    window.setTimeout(() => {
      setAddedAnimation((current) => ({ ...current, [product.id]: false }));
    }, 1200);
  };

  return (
    <div className="catalog-shell overflow-hidden rounded-[2rem] border border-catalog-border bg-catalog-canvas text-catalog-ink shadow-[0_24px_80px_rgba(45,12,31,0.24)]">
      <section className="catalog-hero relative isolate min-h-[520px] overflow-hidden px-6 py-10 sm:px-12 sm:py-16 lg:px-16">
        <div className="catalog-orb catalog-orb-one" />
        <div className="catalog-orb catalog-orb-two" />

        <div className="relative z-10 grid min-h-[420px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <span className="mb-6 inline-flex items-center rounded-full border border-catalog-accent/20 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-catalog-accent backdrop-blur">
              Tu ritual, tu estilo
            </span>
            <h1 aria-label="Belleza que se siente tuya" className="font-serif text-5xl font-semibold leading-[0.98] tracking-[-0.04em] text-catalog-ink sm:text-6xl lg:text-7xl">
              Belleza que se
              <span className="block italic text-catalog-accent">siente tuya</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-catalog-muted sm:text-lg">
              Descubre tonos, tratamientos y esenciales elegidos para acompañar cada versión de ti.
              Compra sin registrarte y finaliza tu pedido con una vendedora Sakura.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#productos"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-catalog-accent px-7 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(194,24,106,0.28)] transition hover:-translate-y-0.5 hover:bg-catalog-accent-strong focus:outline-none focus:ring-2 focus:ring-catalog-accent focus:ring-offset-2"
              >
                Explorar colección
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <span className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-catalog-muted">
                <Check className="h-4 w-4 text-catalog-accent" aria-hidden="true" />
                Pedido rápido y sin cuenta
              </span>
            </div>
          </div>

          <div className="relative mx-auto flex h-[350px] w-full max-w-[440px] items-center justify-center sm:h-[410px]">
            <div className="absolute inset-4 rotate-3 rounded-[3rem] border border-white/80 bg-white/45 shadow-[0_30px_80px_rgba(76,30,53,0.15)] backdrop-blur-sm" />
            <div className="absolute left-0 top-12 rounded-2xl bg-white/85 px-4 py-3 text-xs font-bold text-catalog-ink shadow-lg backdrop-blur">
              <span className="block text-[10px] uppercase tracking-widest text-catalog-muted">Descubre</span>
              Tu próximo favorito
            </div>
            <div className="relative h-56 w-56 sm:h-64 sm:w-64">
              <Image
                src="/sakura-logo.png"
                alt="Sakura Makeup"
                fill
                priority
                className="object-contain drop-shadow-[0_24px_32px_rgba(194,24,106,0.2)]"
              />
            </div>
            <div className="absolute bottom-5 right-0 rounded-2xl border border-white/80 bg-white/85 p-4 shadow-xl backdrop-blur">
              <Heart className="mb-2 h-5 w-5 fill-catalog-accent text-catalog-accent" aria-hidden="true" />
              <p className="text-sm font-bold text-catalog-ink">Elegido para ti</p>
              <p className="mt-0.5 text-xs text-catalog-muted">Tonos con personalidad</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Beneficios de comprar en Sakura Makeup" className="grid border-y border-catalog-border bg-white md:grid-cols-3">
        {trustItems.map(({ icon: Icon, title, detail }) => (
          <div key={title} className="flex items-center gap-4 border-b border-catalog-border px-6 py-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 lg:px-9">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-catalog-blush text-catalog-accent">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <strong className="block text-sm text-catalog-ink">{title}</strong>
              <span className="mt-0.5 block text-xs leading-5 text-catalog-muted">{detail}</span>
            </span>
          </div>
        ))}
      </section>

      <section id="productos" className="scroll-mt-32 px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-catalog-accent">Colección Sakura</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-catalog-ink sm:text-4xl">Encuentra tu favorito</h2>
            <p className="mt-2 text-sm text-catalog-muted">Explora por categoría o encuentra rápidamente un producto o tono.</p>
          </div>

          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-catalog-muted" aria-hidden="true" />
            <input
              type="search"
              aria-label="Buscar productos"
              placeholder="Buscar producto, categoría o tono"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-full border border-catalog-border bg-white py-3 pl-11 pr-4 text-sm text-catalog-ink shadow-sm outline-none transition placeholder:text-catalog-muted/70 focus:border-catalog-accent focus:ring-2 focus:ring-catalog-accent/15"
            />
          </div>
        </div>

        <nav className="mb-7 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar por categoría">
          <button
            type="button"
            onClick={() => setSelectedCategory('')}
            aria-pressed={!selectedCategory}
            className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              !selectedCategory
                ? 'bg-catalog-ink text-white shadow-md'
                : 'border border-catalog-border bg-white text-catalog-muted hover:border-catalog-accent hover:text-catalog-accent'
            }`}
          >
            Todo
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              aria-pressed={selectedCategory === category.id}
              className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                selectedCategory === category.id
                  ? 'bg-catalog-ink text-white shadow-md'
                  : 'border border-catalog-border bg-white text-catalog-muted hover:border-catalog-accent hover:text-catalog-accent'
              }`}
            >
              {category.name}
            </button>
          ))}
        </nav>

        {!loading && !error && <div className="mb-6 flex flex-col gap-3 border-y border-catalog-border py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-catalog-muted" aria-live="polite">
            <strong className="text-catalog-ink">{visibleProducts.length}</strong>{' '}
            {visibleProducts.length === 1 ? 'producto encontrado' : 'productos encontrados'}
          </p>
          <label className="flex items-center gap-3 text-sm font-semibold text-catalog-muted">
            Ordenar por
            <select
              aria-label="Ordenar productos"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="rounded-full border border-catalog-border bg-white px-4 py-2 text-sm text-catalog-ink outline-none focus:border-catalog-accent focus:ring-2 focus:ring-catalog-accent/15"
            >
              <option value="featured">Destacados</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
              <option value="name">Nombre</option>
            </select>
          </label>
        </div>}

        {loading && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-live="polite" aria-label="Cargando productos">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse overflow-hidden rounded-3xl border border-catalog-border bg-white">
                <div className="aspect-[4/5] bg-catalog-blush" />
                <div className="space-y-3 p-4">
                  <div className="h-3 w-1/3 rounded bg-catalog-blush" />
                  <div className="h-4 w-4/5 rounded bg-catalog-blush" />
                  <div className="h-9 rounded-full bg-catalog-blush" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && visibleProducts.length === 0 && (
          <div className="rounded-3xl border border-dashed border-catalog-border bg-white px-6 py-16 text-center">
            <Search className="mx-auto h-8 w-8 text-catalog-accent" aria-hidden="true" />
            <h3 className="mt-4 font-serif text-2xl font-semibold text-catalog-ink">No encontramos coincidencias</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-catalog-muted">Prueba otra palabra o vuelve a mostrar toda la colección.</p>
            <button type="button" onClick={clearFilters} className="mt-6 rounded-full bg-catalog-ink px-6 py-3 text-sm font-bold text-white hover:bg-catalog-accent">
              Limpiar filtros
            </button>
          </div>
        )}

        {!loading && !error && visibleProducts.length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((product) => {
              const currentVariantId = selectedVariants[product.id] ?? product.variants[0]?.id;
              const currentVariant = product.variants.find((variant) => variant.id === currentVariantId) ?? product.variants[0];
              const productImage = currentVariant?.imagePath ?? product.mainImagePath;
              const isAdded = addedAnimation[product.id];

              return (
                <article key={product.id} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-catalog-border bg-white shadow-[0_8px_30px_rgba(55,24,40,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(55,24,40,0.12)] sm:rounded-3xl">
                  <div className="relative aspect-[4/5] overflow-hidden bg-catalog-blush">
                    {productImage ? (
                      <Image
                        src={productImage}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="catalog-product-placeholder flex h-full flex-col items-center justify-center p-5 text-center">
                        <div className="relative h-20 w-20 opacity-90 sm:h-28 sm:w-28">
                          <Image src="/sakura-logo.png" alt="" fill className="object-contain" />
                        </div>
                        <span className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-catalog-accent">Sakura Makeup</span>
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-catalog-ink shadow-sm backdrop-blur">
                      {product.category.name}
                    </span>
                    {!currentVariant?.isAvailable && (
                      <span className="absolute inset-x-3 bottom-3 rounded-full bg-catalog-ink/90 px-3 py-2 text-center text-xs font-bold text-white">Agotado</span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-3.5 sm:p-5">
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-catalog-accent">{product.category.name}</p>
                      <h3 className="mt-1.5 line-clamp-2 text-lg font-bold leading-6 text-catalog-ink sm:text-xl" title={product.name}>{product.name}</h3>
                      {product.description && <p className="mt-2 hidden line-clamp-2 text-sm leading-5 text-catalog-muted sm:block">{product.description}</p>}
                    </div>

                    {product.variants.length > 0 && (
                      <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-catalog-muted">
                        Tono o variante
                        <select
                          value={currentVariantId}
                          onChange={(event) => setSelectedVariants((current) => ({ ...current, [product.id]: event.target.value }))}
                          className="mt-1.5 w-full rounded-xl border border-catalog-border bg-catalog-canvas px-2.5 py-2 text-xs font-medium normal-case tracking-normal text-catalog-ink outline-none focus:border-catalog-accent focus:ring-2 focus:ring-catalog-accent/15"
                        >
                          {product.variants.map((variant) => (
                            <option key={variant.id} value={variant.id} disabled={!variant.isAvailable}>
                              {variant.name}{!variant.isAvailable ? ' · Agotado' : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <div className="mt-4 flex flex-col gap-3 border-t border-catalog-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-catalog-muted">Precio</span>
                        <strong className="text-lg text-catalog-ink sm:text-xl">
                          {currentVariant ? `Q${Number(currentVariant.price).toFixed(2)}` : 'Precio no disponible'}
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        disabled={!currentVariant?.isAvailable}
                        aria-label={`Agregar ${product.name} al carrito`}
                        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:bg-catalog-blush disabled:text-catalog-muted sm:min-h-10 ${
                          isAdded ? 'bg-emerald-600 text-white' : 'bg-catalog-ink text-white hover:bg-catalog-accent'
                        }`}
                      >
                        {isAdded ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingBag className="h-4 w-4" aria-hidden="true" />}
                        <span>{isAdded ? 'Agregado' : 'Agregar'}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
