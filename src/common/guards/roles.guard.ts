import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from 'src/modules/users/enums/user-role.enum';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { type AuthenticatedRequest } from 'src/common/types/authenticated-request.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles: UserRole[] | undefined = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request: AuthenticatedRequest = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRole: UserRole | undefined = request.user?.role;

    if (!userRole) {
      return false;
    }

    return requiredRoles.includes(userRole);
  }
}
