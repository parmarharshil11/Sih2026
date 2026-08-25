import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    // CRITICAL: roles resolved from DB record attached to request, never from client claim
    if (!user || !user.roles) throw new ForbiddenException('Access denied');

    const userRoles = user.roles.map((r: any) => r.name);
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));
    const isAdmin = userRoles.includes('admin');

    if (!hasRole && !isAdmin) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
