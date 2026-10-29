import 'reflect-metadata';
import { Body, Controller, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateOrderDto } from './orders.dto';

@Controller('orders-schema-test')
class OrdersSchemaController {
  @Post()
  create(@Body() _order: CreateOrderDto): void {}
}

@Module({ controllers: [OrdersSchemaController] })
class OrdersSchemaModule {}

describe('CreateOrderDto', () => {
  it('transforms multipart item JSON into validated order items', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      customerName: ' Cliente ',
      customerPhone: ' 55550000 ',
      paymentMethod: 'TRANSFER',
      items: '[{"variantId":"30000000-0000-4000-8000-000000000001","quantity":2}]',
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto).toMatchObject({
      customerName: 'Cliente',
      customerPhone: '55550000',
      items: [{ variantId: '30000000-0000-4000-8000-000000000001', quantity: 2 }],
    });
  });

  it('rejects malformed multipart item JSON', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      customerName: 'Cliente',
      customerPhone: '55550000',
      paymentMethod: 'CASH',
      items: 'not-json',
    });

    await expect(validate(dto)).resolves.not.toEqual([]);
  });

  it.each([
    { customerName: '   ', customerPhone: '55550000' },
    { customerName: 'Cliente', customerPhone: '123' },
  ])('rejects invalid customer identity before reaching PostgreSQL', async (customer) => {
    const dto = plainToInstance(CreateOrderDto, {
      ...customer,
      paymentMethod: 'CASH',
      items: [{ variantId: '30000000-0000-4000-8000-000000000001', quantity: 1 }],
    });

    await expect(validate(dto)).resolves.not.toEqual([]);
  });

  it('generates its OpenAPI schema when running through tsx', async () => {
    const app = await NestFactory.create(OrdersSchemaModule, new ExpressAdapter(), {
      logger: false,
    });

    expect(() => SwaggerModule.createDocument(app, new DocumentBuilder().build())).not.toThrow();

    await app.close();
  });
});
