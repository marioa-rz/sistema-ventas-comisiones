import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./globals.css', import.meta.url), 'utf8');

describe('Catálogo público', () => {
  it('presenta una experiencia editorial con señales de confianza', () => {
    expect(source).toContain('Belleza que se siente tuya');
    expect(source).toContain("import { DM_Serif_Display } from 'next/font/google'");
    expect(source).toContain('const dmSerifDisplay = DM_Serif_Display({');
    expect(source).toContain('${dmSerifDisplay.className}');
    expect(source).toContain('Envíos a toda Guatemala');
    expect(source).toContain('Productos seleccionados');
    expect(source).toContain('Compra segura');
    expect(source).not.toContain('Sparkles');
  });

  it('permite descubrir productos por búsqueda, categoría y orden', () => {
    expect(source).toContain('useCatalogSearch');
    expect(source).toContain('aria-label="Filtrar por categoría"');
    expect(source).toContain('aria-label="Ordenar productos"');
    expect(source).toContain('id="productos"');
    expect(source).toContain('loadAllCatalogProducts');
  });

  it('desplaza suavemente hacia la colección respetando movimiento reducido', () => {
    expect(source).toContain('href="#productos"');
    expect(styles).toContain('html {\n  scroll-behavior: smooth;\n}');
    expect(styles).toContain('scroll-behavior: auto !important;');
  });

  it('incluye estados accesibles de carga, vacío y compra rápida', () => {
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('animate-pulse');
    expect(source).toContain('Limpiar filtros');
    expect(source).toContain('aria-label={`Agregar ${product.name} al carrito`}');
    expect(source).toContain('role="group"');
    expect(source).toContain('updateQuantity');
    expect(source).toContain('Precio no disponible');
  });

  it('optimiza las imágenes de producto con dimensiones responsivas', () => {
    expect(source).toContain('sizes="(max-width: 379px) 100vw, (max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"');
    expect(source).not.toContain('<img src={productImage}');
  });

  it('adapta el hero y la cuadrícula a móviles estrechos', () => {
    expect(source).toContain('text-4xl font-semibold');
    expect(source).toContain('grid grid-cols-1 gap-x-3 gap-y-7 min-[380px]:grid-cols-2');
    expect(source).toContain('grid grid-cols-1 gap-4 min-[380px]:grid-cols-2');
    expect(source).toContain('aspect-[4/3] min-[380px]:aspect-[4/5]');
  });

  it('mantiene filtros y variantes cómodos para interacción táctil', () => {
    expect(source).toContain('snap-x snap-mandatory');
    expect(source).toContain('snap-start min-h-11');
    expect(source).toContain('min-h-11 w-full');
  });

  it('centra simétricamente el selector de cantidad en tarjetas móviles', () => {
    expect(source).toContain('grid w-full grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)]');
    expect(source).toContain('sm:w-auto sm:grid-cols-[2.5rem_2rem_2.5rem]');
    expect(source).toContain('h-11 w-full items-center justify-center');
  });
});
