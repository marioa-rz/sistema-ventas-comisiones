import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UserRole } from '../generated/prisma/client';

export class CreateAppUserDto {
  @ApiProperty({ description: 'Supabase Auth user ID (UUID)' })
  @IsUUID('4')
  @IsNotEmpty()
  authUserId!: string;

  @ApiProperty({ description: 'Display name for the user', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  displayName!: string;

  @ApiProperty({ enum: UserRole, description: 'Role assigned to user' })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({ description: 'Initial active status', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAppUserDto {
  @ApiPropertyOptional({ description: 'Updated display name', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @ApiPropertyOptional({ enum: UserRole, description: 'Updated role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Active status (set false to deactivate)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminUsersFilterDto {
  @ApiPropertyOptional({ enum: UserRole, description: 'Filter by role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Number of items to return', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of items to skip', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
