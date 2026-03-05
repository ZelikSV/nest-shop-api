import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddFileRecords1760000000000 implements MigrationInterface {
  name = 'AddFileRecords1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."file_records_status_enum" AS ENUM('pending', 'ready')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."file_records_visibility_enum" AS ENUM('private', 'public')`,
    );
    await queryRunner.query(`
      CREATE TABLE "file_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ownerId" uuid NOT NULL,
        "entityId" uuid,
        "key" character varying NOT NULL,
        "contentType" character varying NOT NULL,
        "size" integer,
        "status" "public"."file_records_status_enum" NOT NULL DEFAULT 'pending',
        "visibility" "public"."file_records_visibility_enum" NOT NULL DEFAULT 'private',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_file_records" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`ALTER TABLE "users" ADD "avatarFileId" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatarFileId"`);
    await queryRunner.query(`DROP TABLE "file_records"`);
    await queryRunner.query(`DROP TYPE "public"."file_records_visibility_enum"`);
    await queryRunner.query(`DROP TYPE "public"."file_records_status_enum"`);
  }
}
