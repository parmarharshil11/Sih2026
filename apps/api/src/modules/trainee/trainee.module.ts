import { Module } from '@nestjs/common';
import { TraineeController } from './trainee.controller';
import { TraineeService } from './trainee.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TraineeController],
  providers: [TraineeService],
})
export class TraineeModule {}
