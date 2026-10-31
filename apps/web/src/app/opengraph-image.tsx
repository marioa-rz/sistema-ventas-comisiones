import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const alt = 'Sakura Makeup, catálogo de belleza en Guatemala';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #fff9fb, #efcbd9)', color: '#2d1722', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 28, letterSpacing: 8, textTransform: 'uppercase', color: '#9e0f55' }}>Sakura Studio</div>
        <div style={{ marginTop: 24, fontSize: 96, fontWeight: 800 }}>Sakura Makeup</div>
        <div style={{ marginTop: 18, fontSize: 34 }}>Belleza que se siente tuya</div>
      </div>
    </div>,
    size,
  );
}
