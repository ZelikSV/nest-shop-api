import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddAuthFieldsToUser1750000000000 implements MigrationInterface {
  name = 'AddAuthFieldsToUser1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'customer')`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'customer'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
