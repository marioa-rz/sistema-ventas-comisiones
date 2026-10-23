import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiHeader,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { PaymentProofFile } from '../storage/payment-proof.storage';
import { CreateOrderDto } from './orders.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiExtraModels(CreateOrderDto)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000, blockDuration: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('paymentProof', {
      limits: { fileSize: 5 * 1024 * 1024, fieldSize: 64 * 1024, files: 1, fields: 4, parts: 5 },
    }),
  )
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Clave única por intento lógico; reutilizarla al reintentar la misma compra',
  })
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(CreateOrderDto) },
        {
          type: 'object',
          required: ['customerName', 'customerPhone', 'paymentMethod', 'items', 'paymentProof'],
          properties: {
            customerName: { type: 'string', maxLength: 120 },
            customerPhone: { type: 'string', maxLength: 32 },
            paymentMethod: { type: 'string', enum: ['TRANSFER'] },
            items: {
              type: 'string',
              description: 'Arreglo JSON serializado con variantId y quantity',
              example: '[{"variantId":"30000000-0000-4000-8000-000000000001","quantity":1}]',
            },
            paymentProof: { type: 'string', format: 'binary' },
          },
        },
      ],
    },
  })
  @ApiOperation({ summary: 'Crear un pedido público con precios recalculados por el servidor' })
  @ApiCreatedResponse({ description: 'Pedido pendiente creado o respuesta del primer intento idempotente' })
  create(
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @UploadedFile() proof?: PaymentProofFile,
  ) {
    return this.orders.create(dto, validateIdempotencyKey(idempotencyKey), proof);
  }
}

export function validateIdempotencyKey(value: string | undefined): string {
  const key = value?.trim();
  if (!key || key.length < 16 || key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    throw new BadRequestException('Idempotency-Key must contain 16 to 128 safe characters');
  }
  return key;
}
