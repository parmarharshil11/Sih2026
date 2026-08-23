import { Module } from '@nestjs/common';
import { CompetencyController } from './competency.controller';
import { CompetencyService } from './competency.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompetencyController],
  providers: [CompetencyService],
  exports: [CompetencyService],
})
export class CompetencyModule {}
