import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  public getUsers(): string {
    return 'You got users';
  }
}
