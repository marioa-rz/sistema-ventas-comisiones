import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('Catálogo público', () => {
  it('presenta una experiencia editorial con señales de confianza', () => {
    expect(source).toContain('Belleza que se siente tuya');
    expect(source).toContain('Envíos a toda Guatemala');
    expect(source).toContain('Productos seleccionados');
    expect(source).toContain('Compra segura');
    expect(source).not.toContain('Sparkles');
  });

  it('permite descubrir productos por búsqueda, categoría y orden', () => {
    expect(source).toContain('aria-label="Buscar productos"');
    expect(source).toContain('aria-label="Filtrar por categoría"');
    expect(source).toContain('aria-label="Ordenar productos"');
    expect(source).toContain('id="productos"');
    expect(source).toContain('loadAllCatalogProducts');
  });

  it('incluye estados accesibles de carga, vacío y compra rápida', () => {
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('animate-pulse');
    expect(source).toContain('Limpiar filtros');
    expect(source).toContain('aria-label={`Agregar ${product.name} al carrito`}');
    expect(source).toContain('Precio no disponible');
  });

  it('optimiza las imágenes de producto con dimensiones responsivas', () => {
    expect(source).toContain('sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"');
    expect(source).not.toContain('<img src={productImage}');
  });
});
