import { SetMetadata } from '@nestjs/common';
import type { AuthenticatedUser } from '../users/users.service';

export const ROLES_KEY = 'allowed_roles';
export const Roles = (...roles: AuthenticatedUser['role'][]) => SetMetadata(ROLES_KEY, roles);
