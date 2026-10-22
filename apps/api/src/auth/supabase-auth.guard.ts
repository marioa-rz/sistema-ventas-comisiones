import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import type { AuthenticatedRequest } from './authenticated-request';
import { extractBearerToken } from './bearer-token';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly authentication: AuthenticationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const header = Array.isArray(authorization) ? undefined : authorization;
    const token = extractBearerToken(header);
    request.user = await this.authentication.authenticate(token);
    return true;
  }
}
