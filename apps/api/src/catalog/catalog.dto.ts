import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CatalogQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Transform(trim)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trim)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(120)
  slug!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trim)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateProductDto {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  @Transform(trim)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  @Transform(trim)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mainImagePath?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProductDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  @Transform(trim)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  @Transform(trim)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mainImagePath?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateVariantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Transform(trim)
  sku!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(trim)
  name!: string;

  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/)
  price!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imagePath?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class UpdateVariantDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Transform(trim)
  sku?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(trim)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/)
  price?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imagePath?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
