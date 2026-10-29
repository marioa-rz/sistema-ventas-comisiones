import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('Confirmación pública del pedido', () => {
  it('confirma el pedido sin mostrar iconos decorativos de estrellas', () => {
    expect(source).toContain('¡Pedido Generado con Éxito!');
    expect(source).not.toContain('Sparkles');
  });
});
