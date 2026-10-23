import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AdminCommissionsController } from './admin-commissions.controller';
import { CommissionsService } from './commissions.service';
import { SellerCommissionsController } from './seller-commissions.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [SellerCommissionsController, AdminCommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
