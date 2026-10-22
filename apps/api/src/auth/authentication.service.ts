import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { TOKEN_VERIFIER, type TokenVerifier } from './token-verifier';
import { UsersService, type AuthenticatedUser } from '../users/users.service';

@Injectable()
export class AuthenticationService {
  constructor(
    @Inject(TOKEN_VERIFIER)
    private readonly verifier: TokenVerifier,
    private readonly users: UsersService,
  ) {}

  async authenticate(token: string): Promise<AuthenticatedUser> {
    let subject: string;
    try {
      ({ subject } = await this.verifier.verify(token));
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    const profile = await this.users.findActiveByAuthUserId(subject);
    if (!profile) {
      throw new UnauthorizedException('Access denied');
    }
    return profile;
  }
}
