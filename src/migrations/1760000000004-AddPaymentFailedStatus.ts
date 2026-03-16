import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddPaymentFailedStatus1760000000004 implements MigrationInterface {
  name = 'AddPaymentFailedStatus1760000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "order_status_enum" ADD VALUE 'payment_failed'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support DROP VALUE — recreate enum without 'payment_failed'
    await queryRunner.query(
      `CREATE TYPE "order_status_enum_new" AS ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'processed')`,
    );
    await queryRunner.query(`
      ALTER TABLE "orders"
        ALTER COLUMN "status" TYPE "order_status_enum_new"
        USING (
          CASE WHEN "status"::text = 'payment_failed' THEN 'cancelled'::"order_status_enum_new"
               ELSE "status"::text::"order_status_enum_new"
          END
        )
    `);
    await queryRunner.query(`DROP TYPE "order_status_enum"`);
    await queryRunner.query(`ALTER TYPE "order_status_enum_new" RENAME TO "order_status_enum"`);
  }
}
