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
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../generated/prisma/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const normalizeGuatemalanPhone = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('502')) digits = digits.slice(3);
  return digits;
};
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
  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  variantId!: string;

  @ApiProperty({ type: Number, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;

  // Accepted only so an untrusted client value can be explicitly ignored by the service.
  @ApiPropertyOptional({ type: String, description: 'Ignored; the API always reads the current database price.' })
  @IsOptional()
  @IsString()
  unitPrice?: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: String, maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(trim)
  customerName!: string;

  @ApiProperty({
    type: String,
    minLength: 8,
    maxLength: 8,
    pattern: '^[2-7][0-9]{7}$',
    example: '55550000',
    description: 'Número telefónico de Guatemala, normalizado a ocho dígitos',
  })
  @IsString()
  @Matches(/^[2-7]\d{7}$/)
  @Transform(normalizeGuatemalanPhone)
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
