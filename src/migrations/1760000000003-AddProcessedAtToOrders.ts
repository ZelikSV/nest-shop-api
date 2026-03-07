import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddProcessedAtToOrders1760000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "processedAt" TIMESTAMP WITHOUT TIME ZONE NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "processedAt"`);
  }
}
