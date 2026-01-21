import { type IUser } from '../types/users';

export const users: IUser[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    firstName: 'John',
    lastName: 'Doe',
    age: 28,
    email: 'john.doe@example.com',
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    firstName: 'Jane',
    lastName: 'Smith',
    age: 34,
    email: 'jane.smith@example.com',
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    firstName: 'Mike',
    lastName: 'Johnson',
    age: 42,
    email: 'mike.johnson@example.com',
  },
];
