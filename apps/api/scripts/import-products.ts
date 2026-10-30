import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

interface ProductItem {
  filename: string;
  categoryName: string;
  categorySlug: string;
  productName: string;
  description: string;
  variantName: string;
  sku: string;
  price: string;
}

const PRODUCTS: ProductItem[] = [
  {
    filename: 'ELF-BLUSH-CAMO-SUAVEMAUVE-4ML.webp',
    categoryName: 'Rubores',
    categorySlug: 'rubores',
    productName: 'e.l.f. Camo Liquid Blush',
    description: 'Rubor líquido de alta pigmentación y larga duración.',
    variantName: 'Suave Mauve (4ml)',
    sku: 'ELF-BLUSH-CAMO-SUAVEMAUVE-4ML',
    price: '125.00',
  },
  {
    filename: 'ELF-BLUSH-HALOGLOW-CANDYCORAL-10ML.webp',
    categoryName: 'Rubores',
    categorySlug: 'rubores',
    productName: 'e.l.f. Halo Glow Liquid Blush',
    description: 'Rubor líquido con acabado luminoso Halo Glow.',
    variantName: 'Candy Coral (10ml)',
    sku: 'ELF-BLUSH-HALOGLOW-CANDYCORAL-10ML',
    price: '100.00',
  },
  {
    filename: 'ELF-BROWCREAM-LOCKON-MEDIUMBROWN-5.5G.webp',
    categoryName: 'Cejas y Ojos',
    categorySlug: 'cejas-y-ojos',
    productName: 'e.l.f. Lock On Liner & Brow Cream',
    description: 'Pomada cremosa para cejas y delineado resistente.',
    variantName: 'Medium Brown (5.5g)',
    sku: 'ELF-BROWCREAM-LOCKON-MEDIUMBROWN-5.5G',
    price: '85.00',
  },
  {
    filename: 'ELF-CONTOUR-HALOGLOW-MEDIUMDARK-10ML.webp',
    categoryName: 'Contorno e Iluminador',
    categorySlug: 'contorno-e-iluminador',
    productName: 'e.l.f. Halo Glow Contour Beauty Wand',
    description: 'Varita de contorno líquido con aplicador de esponja.',
    variantName: 'Medium/Dark (10ml)',
    sku: 'ELF-CONTOUR-HALOGLOW-MEDIUMDARK-10ML',
    price: '100.00',
  },
  {
    filename: 'ELF-HIGHLIGHT-HALOGLOW-STARDUST-4.5G.webp',
    categoryName: 'Contorno e Iluminador',
    categorySlug: 'contorno-e-iluminador',
    productName: 'e.l.f. Halo Glow Silky Powder Highlighter',
    description: 'Iluminador en polvo sedoso de máximo brillo.',
    variantName: 'Stardust (4.5g)',
    sku: 'ELF-HIGHLIGHT-HALOGLOW-STARDUST-4.5G',
    price: '130.00',
  },
  {
    filename: 'ELF-LIPOIL-GLOWREVIVER-HONEYGLIMMER-7.6ML.webp',
    categoryName: 'Labiales y Brillos',
    categorySlug: 'labiales-y-brillos',
    productName: 'e.l.f. Glow Reviver Lip Oil Glimmer Finish',
    description: 'Aceite labial nutritivo con destellos brillantes.',
    variantName: 'Honey Glimmer (7.6ml)',
    sku: 'ELF-LIPOIL-GLOWREVIVER-HONEYGLIMMER-7.6ML',
    price: '135.00',
  },
  {
    filename: 'ELF-LIPOIL-GLOWREVIVER-PINKPINK-7.6ML.webp',
    categoryName: 'Labiales y Brillos',
    categorySlug: 'labiales-y-brillos',
    productName: 'e.l.f. Glow Reviver Lip Oil',
    description: 'Aceite hidratante de labios con toque de color.',
    variantName: 'Pink Quartz / Pink Pink (7.6ml)',
    sku: 'ELF-LIPOIL-GLOWREVIVER-PINKPINK-7.6ML',
    price: '135.00',
  },
  {
    filename: 'ELF-PALETTE-POWDERBLUSH-LIGHT-13.4G.webp',
    categoryName: 'Rubores',
    categorySlug: 'rubores',
    productName: 'e.l.f. Powder Blush Palette',
    description: 'Paleta con cuatro tonos de rubor combinables.',
    variantName: 'Light (13.4g)',
    sku: 'ELF-PALETTE-POWDERBLUSH-LIGHT-13.4G',
    price: '140.00',
  },
  {
    filename: 'ELF-PRIMER-BLEMISHCONTROL-GREEN-14ML.webp',
    categoryName: 'Primers',
    categorySlug: 'primers',
    productName: 'e.l.f. Blemish Control Face Primer',
    description: 'Primer facial corrector de rojeces y control de imperfecciones.',
    variantName: 'Green (14ml)',
    sku: 'ELF-PRIMER-BLEMISHCONTROL-GREEN-14ML',
    price: '120.00',
  },
  {
    filename: 'ELF-PRIMER-HYDRATING-CLEAR-14ML.webp',
    categoryName: 'Primers',
    categorySlug: 'primers',
    productName: 'e.l.f. Hydrating Face Primer',
    description: 'Primer hidratante transparente para piel suave.',
    variantName: 'Clear (14ml)',
    sku: 'ELF-PRIMER-HYDRATING-CLEAR-14ML',
    price: '120.00',
  },
  {
    filename: 'ELF-PRIMER-POWERGRIP-CLEAR-24ML.webp',
    categoryName: 'Primers',
    categorySlug: 'primers',
    productName: 'e.l.f. Power Grip Primer',
    description: 'Primer a base de gel con fijación extrema del maquillaje.',
    variantName: 'Clear (24ml)',
    sku: 'ELF-PRIMER-POWERGRIP-CLEAR-24ML',
    price: '150.00',
  },
  {
    filename: 'MAYB-GLOSS-LIFTER-ICE-5.4ML.webp',
    categoryName: 'Labiales y Brillos',
    categorySlug: 'labiales-y-brillos',
    productName: 'Maybelline Lifter Gloss',
    description: 'Brillo labial hidratante con ácido hialurónico.',
    variantName: 'Ice (5.4ml)',
    sku: 'MAYB-GLOSS-LIFTER-ICE-5.4ML',
    price: '120.00',
  },
  {
    filename: 'MAYB-GLOSS-LIFTER-MOON-5.4ML.webp',
    categoryName: 'Labiales y Brillos',
    categorySlug: 'labiales-y-brillos',
    productName: 'Maybelline Lifter Gloss',
    description: 'Brillo labial hidratante con ácido hialurónico.',
    variantName: 'Moon (5.4ml)',
    sku: 'MAYB-GLOSS-LIFTER-MOON-5.4ML',
    price: '100.00',
  },
  {
    filename: 'MAYB-GLOSS-LIFTER-RUBY-5.4ML.webp',
    categoryName: 'Labiales y Brillos',
    categorySlug: 'labiales-y-brillos',
    productName: 'Maybelline Lifter Gloss',
    description: 'Brillo labial hidratante con ácido hialurónico.',
    variantName: 'Ruby (5.4ml)',
    sku: 'MAYB-GLOSS-LIFTER-RUBY-5.4ML',
    price: '100.00',
  },
  {
    filename: 'MAYB-TINT-TEDDY-COQUETTISH-5ML.webp',
    categoryName: 'Labiales y Brillos',
    categorySlug: 'labiales-y-brillos',
    productName: 'Maybelline Teddy Tint Lip Color',
    description: 'Tinta labial aterciopelada mate de larga duración.',
    variantName: 'Coquettish (5ml)',
    sku: 'MAYB-TINT-TEDDY-COQUETTISH-5ML',
    price: '125.00',
  },
  {
    filename: 'NYX-GLOSS-BUTTER-DEVIL-8ML.webp',
    categoryName: 'Labiales y Brillos',
    categorySlug: 'labiales-y-brillos',
    productName: 'NYX Butter Gloss',
    description: 'Brillo labial suave y sedoso no pegajoso.',
    variantName: 'Devil (8ml)',
    sku: 'NYX-GLOSS-BUTTER-DEVIL-8ML',
    price: '85.00',
  },
  {
    filename: 'NYX-GLOSS-LIPIV-SPLASHNSPICE-5ML.webp',
    categoryName: 'Labiales y Brillos',
    categorySlug: 'labiales-y-brillos',
    productName: "NYX Lip I.V. Hydrating Gloss Stain",
    description: 'Tinta brillosa de alta hidratación con color vibrante.',
    variantName: "Splash N' Spice (5ml)",
    sku: 'NYX-GLOSS-LIPIV-SPLASHNSPICE-5ML',
    price: '140.00',
  },
  {
    filename: 'NYX-PRIMER-MARSHMELLOW-ORIGINAL-30ML.webp',
    categoryName: 'Primers',
    categorySlug: 'primers',
    productName: 'NYX The Marshmellow Primer',
    description: 'Primer alisador 10 en 1 con extracto de raíz de malvavisco.',
    variantName: 'Original (30ml)',
    sku: 'NYX-PRIMER-MARSHMELLOW-ORIGINAL-30ML',
    price: '135.00',
  },
  {
    filename: 'SHEGLAM-POWDER-INSTAREADY-TRANSLUCENT-14G.webp',
    categoryName: 'Polvos y Fijación',
    categorySlug: 'polvos-y-fijacion',
    productName: 'SHEGLAM Insta-Ready Setting Powder Duo',
    description: 'Dúo de polvo compacto y polvo traslúcido para fijación.',
    variantName: 'Translucent (14g)',
    sku: 'SHEGLAM-POWDER-INSTAREADY-TRANSLUCENT-14G',
    price: '100.00',
  },
];

async function uploadToSupabaseStorage(
  supabaseUrl: string,
  apiKey: string,
  bucket: string,
  filePath: string,
  destinationPath: string,
): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${destinationPath}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'image/webp',
      'x-upsert': 'true',
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload ${destinationPath}: ${response.status} ${errorText}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${destinationPath}`;
}

async function main() {
  const sourceDir = process.env.SOURCE_DIR || '/Users/mairo/Downloads/Productos';
  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, '');
  const apiKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  const bucket = process.env.SUPABASE_STORAGE_PRODUCT_BUCKET || 'product-images';
  const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

  if (!supabaseUrl || !apiKey) {
    throw new Error('Supabase credentials (SUPABASE_URL and key) are required');
  }
  if (!databaseUrl) {
    throw new Error('DIRECT_URL or DATABASE_URL is required');
  }

  console.log(`Verificando carpeta de imágenes en: ${sourceDir}`);
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Directory not found: ${sourceDir}`);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  try {
    for (const item of PRODUCTS) {
      console.log(`\n--- Procesando: ${item.productName} (${item.variantName}) ---`);
      const localFilePath = path.join(sourceDir, item.filename);

      if (!fs.existsSync(localFilePath)) {
        console.warn(`[AVISO] Archivo no encontrado: ${localFilePath}. Omitiendo.`);
        continue;
      }

      // 1. Subir imagen a Supabase Storage
      const destinationPath = `products/${item.filename}`;
      console.log(`Subiendo a Storage: ${bucket}/${destinationPath}...`);
      const publicUrl = await uploadToSupabaseStorage(
        supabaseUrl,
        apiKey,
        bucket,
        localFilePath,
        destinationPath,
      );
      console.log(`Imagen pública: ${publicUrl}`);

      // 2. Crear o actualizar Categoría
      const category = await prisma.category.upsert({
        where: { slug: item.categorySlug },
        update: { name: item.categoryName, isActive: true },
        create: {
          name: item.categoryName,
          slug: item.categorySlug,
          isActive: true,
        },
      });

      // 3. Crear o buscar Producto por nombre y categoría
      let product = await prisma.product.findFirst({
        where: {
          categoryId: category.id,
          name: item.productName,
        },
      });

      if (!product) {
        product = await prisma.product.create({
          data: {
            categoryId: category.id,
            name: item.productName,
            description: item.description,
            mainImagePath: publicUrl,
            isActive: true,
          },
        });
        console.log(`Producto creado: ${product.name} (ID: ${product.id})`);
      } else {
        product = await prisma.product.update({
          where: { id: product.id },
          data: {
            mainImagePath: publicUrl,
            description: item.description,
            isActive: true,
          },
        });
        console.log(`Producto actualizado: ${product.name} (ID: ${product.id})`);
      }

      // 4. Crear o actualizar Variante con SKU y Precio
      const variant = await prisma.productVariant.upsert({
        where: { sku: item.sku },
        update: {
          name: item.variantName,
          price: item.price,
          isAvailable: true,
          productId: product.id,
        },
        create: {
          productId: product.id,
          sku: item.sku,
          name: item.variantName,
          price: item.price,
          isAvailable: true,
        },
      });
      console.log(`Variante lista: SKU=${variant.sku}, Precio=Q${variant.price}`);
    }

    console.log('\n========================================');
    console.log('¡Todos los productos fueron importados con éxito!');
    console.log('========================================');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Error durante la importación:', err);
  process.exit(1);
});
