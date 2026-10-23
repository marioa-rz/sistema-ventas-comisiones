import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedUser } from '../users/users.service';
import { AdminCatalogService } from './admin-catalog.service';
import {
  CreateCategoryDto,
  CreateProductDto,
  CreateVariantDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateVariantDto,
} from './catalog.dto';

@ApiTags('admin catalog')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCatalogController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Listar catálogo completo, incluidos registros inactivos' })
  listCatalog() {
    return this.catalog.listCatalog();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Crear una categoría' })
  createCategory(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateCategoryDto) {
    return this.catalog.createCategory(actor.id, dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Editar o desactivar una categoría' })
  updateCategory(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.catalog.updateCategory(actor.id, id, dto);
  }

  @Post('products')
  @ApiOperation({ summary: 'Crear un producto' })
  createProduct(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateProductDto) {
    return this.catalog.createProduct(actor.id, dto);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Editar o desactivar un producto' })
  updateProduct(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.catalog.updateProduct(actor.id, id, dto);
  }

  @Post('products/:productId/variants')
  @ApiOperation({ summary: 'Crear una variante de producto' })
  createVariant(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.catalog.createVariant(actor.id, productId, dto);
  }

  @Patch('variants/:id')
  @ApiOperation({ summary: 'Editar precio o disponibilidad de una variante' })
  updateVariant(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.catalog.updateVariant(actor.id, id, dto);
  }
}
