import { Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AdminUsersFilterDto, CreateAppUserDto, UpdateAppUserDto } from './users.dto';
import { AuthenticatedUser, UsersService } from './users.service';

@ApiTags('admin users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios del sistema con filtros de rol y estado activo' })
  list(@Query() filters: AdminUsersFilterDto) {
    return this.users.listUsers(filters);
  }

  @Post()
  @ApiOperation({ summary: 'Vincular un nuevo usuario (ADMIN o SELLER) con su identidad de Supabase Auth' })
  create(@CurrentUser() admin: AuthenticatedUser, @Body() dto: CreateAppUserDto) {
    return this.users.createUser(admin.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar detalle de un usuario' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getUserById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar nombre, rol o activar/desactivar un usuario' })
  update(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppUserDto,
  ) {
    return this.users.updateUser(admin.id, id, dto);
  }

  @Get(':id/sales')
  @ApiOperation({ summary: 'Consultar historial de ventas individuales y comisiones de un vendedor' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  getSalesHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.users.getSellerSalesHistory(id, parsedLimit, parsedOffset);
  }
}
