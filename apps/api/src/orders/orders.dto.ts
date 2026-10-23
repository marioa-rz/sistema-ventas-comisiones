import { plainToInstance, Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  MinLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../generated/prisma/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const parseItems = ({ value }: { value: unknown }) => {
  let parsed = value;
  try {
    if (typeof value === 'string') parsed = JSON.parse(value) as unknown;
  } catch {
    return value;
  }
  return Array.isArray(parsed) ? plainToInstance(CreateOrderItemDto, parsed) : parsed;
};

export class CreateOrderItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  variantId!: string;

  @ApiProperty({ minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;

  // Accepted only so an untrusted client value can be explicitly ignored by the service.
  @ApiPropertyOptional({ description: 'Ignored; the API always reads the current database price.' })
  @IsOptional()
  @IsString()
  unitPrice?: string;
}

export class CreateOrderDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(trim)
  customerName!: string;

  @ApiProperty({ minLength: 7, maxLength: 32 })
  @IsString()
  @MinLength(7)
  @MaxLength(32)
  @Transform(trim)
  customerPhone!: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiProperty({ type: () => [CreateOrderItemDto], minItems: 1, maxItems: 50 })
  @Transform(parseItems)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
