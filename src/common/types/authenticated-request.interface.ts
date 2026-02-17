import { type Request } from 'express';
import { type UserRole } from 'src/modules/users/enums/user-role.enum';

export interface JwtUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user: JwtUser;
}
