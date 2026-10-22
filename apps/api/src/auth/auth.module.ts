import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthenticationService } from './authentication.service';
import { RolesGuard } from './roles.guard';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SupabaseJwtVerifier } from './supabase-jwt-verifier';
import { TOKEN_VERIFIER } from './token-verifier';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthenticationService,
    SupabaseAuthGuard,
    RolesGuard,
    SupabaseJwtVerifier,
    { provide: TOKEN_VERIFIER, useExisting: SupabaseJwtVerifier },
  ],
  exports: [AuthenticationService, SupabaseAuthGuard, RolesGuard],
})
export class AuthModule {}
