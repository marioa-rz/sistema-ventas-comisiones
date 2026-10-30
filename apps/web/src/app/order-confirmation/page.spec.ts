import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('Confirmación pública del pedido', () => {
  it('confirma el pedido sin mostrar iconos decorativos de estrellas', () => {
    expect(source).toContain('¡Pedido Generado con Éxito!');
    expect(source).not.toContain('Sparkles');
  });

  it('muestra claramente los pasos a seguir para procesar el pedido con la vendedora', () => {
    expect(source).toContain('¿Qué sigue ahora?');
    expect(source).toContain('Copia tu código o compártelo a tu vendedora por mensaje.');
    expect(source).toContain('Tu vendedora ingresará el código en su sistema para asignarse tu pedido.');
    expect(source).toContain('La administración confirmará la venta cuando valide el pago correspondiente.');
    expect(source).toContain('Los paquetes se envían el día siguiente a la compra');
  });

  it('expone con claridad las políticas de servicio y reintentos de mensajería', () => {
    expect(source).toContain('Políticas de Envío y Entrega');
    expect(source).toContain('el producto sigue siendo de la clienta');
    expect(source).toContain('dicho cobro va para la clienta');
  });
});
