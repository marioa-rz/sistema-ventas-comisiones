import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface AuthenticatedUser {
  id: string;
  authUserId: string;
  displayName: string;
  role: 'ADMIN' | 'SELLER';
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByAuthUserId(authUserId: string): Promise<AuthenticatedUser | null> {
    return this.prisma.appUser.findFirst({
      where: { authUserId, isActive: true },
      select: {
        id: true,
        authUserId: true,
        displayName: true,
        role: true,
      },
    });
  }
}
