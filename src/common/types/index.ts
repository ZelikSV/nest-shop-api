import { type UserRole } from 'src/modules/users/enums/user-role.enum';

export interface IUser {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  email: string;
  password: string;
  role: UserRole;
  avatarFileId: string | null;
}

export interface IProduct {
  name: string;
  description: string;
  price: number;
  stock: number;
}
