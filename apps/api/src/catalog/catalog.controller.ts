import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogQueryDto } from './catalog.dto';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Categorías activas del catálogo público' })
  @ApiOkResponse({ description: 'Categorías activas ordenadas por nombre' })
  listCategories() {
    return this.catalog.listCategories();
  }

  @Get('products')
  @ApiOperation({ summary: 'Productos activos con variantes y precios vigentes' })
  @ApiOkResponse({ description: 'Catálogo público filtrable por nombre y categoría' })
  listProducts(@Query() query: CatalogQueryDto) {
    return this.catalog.listProducts(query);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Detalle de un producto activo' })
  getProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.getProduct(id);
  }
}
