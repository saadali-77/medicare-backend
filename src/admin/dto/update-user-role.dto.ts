import { IsEnum } from 'class-validator';
import { UserRole } from '../../../generated/prisma';

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
