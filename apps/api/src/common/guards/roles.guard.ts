import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (!requiredRoles.length && !requiredPermissions.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const roles: string[] = user.roles || [];
    const permissions: string[] = user.permissions || [];

    if (roles.includes('SUPER_ADMIN')) return true;

    const roleOk =
      !requiredRoles.length ||
      requiredRoles.some((r) => roles.includes(r));
    const permOk =
      !requiredPermissions.length ||
      requiredPermissions.every((p) => permissions.includes(p));

    return roleOk && permOk;
  }
}
