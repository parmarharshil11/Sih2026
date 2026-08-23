import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import * as fileType from 'file-type';

@Injectable()
export class FileValidationInterceptor implements NestInterceptor {
  private allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const file = request.file;

    if (file) {
      if (!this.allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Invalid file type based on mimetype');
      }

      const typeResult = await fileType.fromBuffer(file.buffer);
      if (!typeResult || !this.allowedMimeTypes.includes(typeResult.mime)) {
        throw new BadRequestException('Invalid file magic bytes. File might be forged.');
      }
    }

    return next.handle();
  }
}
