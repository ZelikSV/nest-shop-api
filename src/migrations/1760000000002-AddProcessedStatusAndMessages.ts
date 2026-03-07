import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddProcessedStatusAndMessages1760000000002 implements MigrationInterface {
  name = 'AddProcessedStatusAndMessages1760000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "order_status_enum" ADD VALUE 'processed'`);

    await queryRunner.query(`
      CREATE TABLE "processed_messages" (
        "message_id"   uuid        NOT NULL,
        "order_id"     uuid        NOT NULL,
        "processed_at" TIMESTAMP   NOT NULL DEFAULT now(),
        "handler"      varchar(100),
        CONSTRAINT "PK_processed_messages" PRIMARY KEY ("message_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "processed_messages"`);

    // PostgreSQL does not support DROP VALUE — recreate enum without 'processed'
    await queryRunner.query(
      `CREATE TYPE "order_status_enum_new" AS ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')`,
    );
    await queryRunner.query(`
      ALTER TABLE "orders"
        ALTER COLUMN "status" TYPE "order_status_enum_new"
        USING (
          CASE WHEN "status"::text = 'processed' THEN 'pending'::"order_status_enum_new"
               ELSE "status"::text::"order_status_enum_new"
          END
        )
    `);
    await queryRunner.query(`DROP TYPE "order_status_enum"`);
    await queryRunner.query(`ALTER TYPE "order_status_enum_new" RENAME TO "order_status_enum"`);
  }
}
