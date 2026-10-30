import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const globalsSource = readFileSync(new URL('./globals.css', import.meta.url), 'utf8');
const catalogSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const cartSource = readFileSync(new URL('./cart/page.tsx', import.meta.url), 'utf8');
const confirmationSource = readFileSync(
  new URL('./order-confirmation/page.tsx', import.meta.url),
  'utf8',
);
const navbarSource = readFileSync(
  new URL('../components/public-navbar.tsx', import.meta.url),
  'utf8',
);

describe('movimiento del flujo público', () => {
  it('comparte duraciones y curvas de movimiento con reducción accesible', () => {
    expect(globalsSource).toContain('--motion-duration-fast: 160ms;');
    expect(globalsSource).toContain('--motion-duration-base: 280ms;');
    expect(globalsSource).toContain('--motion-ease-standard: cubic-bezier(0.2, 0, 0, 1);');
    expect(globalsSource).toContain('--motion-ease-emphasized: cubic-bezier(0.2, 0.8, 0.2, 1);');
    expect(globalsSource).toContain('@media (prefers-reduced-motion: reduce)');
    expect(globalsSource).toContain('.motion-parallax');
  });

  it('orquesta el hero y los productos con máscara, profundidad y stagger', () => {
    expect(globalsSource).toContain('@keyframes customer-enter');
    expect(globalsSource).toContain('@keyframes customer-dolly');
    expect(globalsSource).toContain('.motion-mask');
    expect(globalsSource).toContain('.motion-card::after');
    expect(catalogSource).toContain('motion-hero-copy');
    expect(catalogSource).toContain('motion-dolly');
    expect(catalogSource).toContain("'--motion-index': index");
    expect(catalogSource).toContain('motion-card');
  });

  it('libera la sombra del hero al terminar la máscara de entrada', () => {
    expect(globalsSource).toContain('clip-path: inset(-25% round 0);');
    expect(globalsSource).not.toContain('clip-path: inset(0 round 0);');
  });

  it('anima los cambios de valor y las transiciones críticas del checkout', () => {
    expect(globalsSource).toContain('@keyframes customer-value-change');
    expect(navbarSource).toContain('motion-search-reveal');
    expect(navbarSource).toContain('motion-value-change');
    expect(cartSource).toContain('motion-stagger');
    expect(cartSource).toContain('motion-feedback');
    expect(confirmationSource).toContain('motion-confirmation');
  });

  it('evita transicionar propiedades innecesarias en el flujo público', () => {
    expect(navbarSource).not.toContain('transition-all');
    expect(cartSource).not.toContain('transition-all');
    expect(confirmationSource).not.toContain('transition-all');
  });
});
