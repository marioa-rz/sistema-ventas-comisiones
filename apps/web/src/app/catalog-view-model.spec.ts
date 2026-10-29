import { describe, expect, it, vi } from 'vitest';
import {
  filterAndSortProducts,
  getMinimumAvailablePrice,
  loadAllCatalogProducts,
  type Product,
} from './catalog-view-model';

const makeProduct = (id: string, categoryId: string, prices: string[], name = id): Product => ({
  id,
  name,
  description: null,
  mainImagePath: null,
  category: { id: categoryId, name: categoryId },
  variants: prices.map((price, index) => ({
    id: `${id}-${index}`,
    sku: `${id}-${index}`,
    name: index === 0 ? 'Rosa' : 'Nude',
    price,
    imagePath: null,
    isAvailable: true,
  })),
});

describe('modelo de vista del catálogo', () => {
  it('carga todas las páginas y no se limita a los primeros 20 productos', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => makeProduct(String(index), 'labios', ['10']));
    const lastPage = [makeProduct('100', 'rostro', ['20'])];
    const fetchPage = vi.fn(async (_limit: number, offset: number) => (offset === 0 ? firstPage : lastPage));

    const products = await loadAllCatalogProducts(fetchPage);

    expect(products).toHaveLength(101);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 100, 0);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 100, 100);
  });

  it('ordena por el menor precio disponible y deja productos sin precio al final', () => {
    const products = [
      makeProduct('sin-precio', 'labios', []),
      makeProduct('caro', 'labios', ['90', '30']),
      makeProduct('barato', 'labios', ['20']),
    ];

    expect(getMinimumAvailablePrice(products[1])).toBe(30);
    expect(filterAndSortProducts(products, { searchQuery: '', selectedCategory: '', sortBy: 'price-asc' }).map(({ id }) => id))
      .toEqual(['barato', 'caro', 'sin-precio']);
    expect(filterAndSortProducts(products, { searchQuery: '', selectedCategory: '', sortBy: 'price-desc' }).map(({ id }) => id))
      .toEqual(['caro', 'barato', 'sin-precio']);
  });

  it('busca por tono y respeta la categoría seleccionada', () => {
    const products = [makeProduct('uno', 'labios', ['20'], 'Gloss'), makeProduct('dos', 'rostro', ['30'], 'Base')];

    expect(filterAndSortProducts(products, { searchQuery: 'rosa', selectedCategory: 'labios', sortBy: 'featured' }).map(({ id }) => id))
      .toEqual(['uno']);
  });
});
