import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddInvoiceFileId1760000000001 implements MigrationInterface {
  name = 'AddInvoiceFileId1760000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD "invoiceFileId" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "invoiceFileId"`);
  }
}
