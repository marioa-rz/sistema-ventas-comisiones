export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  price: string;
  imagePath: string | null;
  isAvailable: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  mainImagePath: string | null;
  category: { id: string; name: string };
  variants: ProductVariant[];
}

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name';

export const CATALOG_PAGE_SIZE = 100;

export async function loadAllCatalogProducts(
  fetchPage: (limit: number, offset: number) => Promise<Product[]>,
): Promise<Product[]> {
  const products: Product[] = [];
  let offset = 0;

  while (true) {
    const page = await fetchPage(CATALOG_PAGE_SIZE, offset);
    products.push(...page);

    if (page.length < CATALOG_PAGE_SIZE) return products;
    offset += page.length;
  }
}

export function getMinimumAvailablePrice(product: Product): number | null {
  const prices = product.variants
    .filter((variant) => variant.isAvailable)
    .map((variant) => Number(variant.price))
    .filter(Number.isFinite);

  return prices.length > 0 ? Math.min(...prices) : null;
}

export function filterAndSortProducts(
  products: Product[],
  options: { searchQuery: string; selectedCategory: string; sortBy: SortOption },
): Product[] {
  const normalizedQuery = options.searchQuery.trim().toLocaleLowerCase('es-GT');
  const filtered = products.filter((product) => {
    const matchesCategory = !options.selectedCategory || product.category.id === options.selectedCategory;
    const searchableText = [
      product.name,
      product.description ?? '',
      product.category.name,
      ...product.variants.map((variant) => variant.name),
    ]
      .join(' ')
      .toLocaleLowerCase('es-GT');

    return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
  });

  return [...filtered].sort((a, b) => {
    if (options.sortBy === 'name') return a.name.localeCompare(b.name, 'es');
    if (options.sortBy === 'featured') return 0;

    const priceA = getMinimumAvailablePrice(a);
    const priceB = getMinimumAvailablePrice(b);
    if (priceA === null && priceB === null) return a.name.localeCompare(b.name, 'es');
    if (priceA === null) return 1;
    if (priceB === null) return -1;

    return options.sortBy === 'price-asc' ? priceA - priceB : priceB - priceA;
  });
}
