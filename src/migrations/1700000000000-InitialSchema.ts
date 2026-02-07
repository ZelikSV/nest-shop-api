import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `CREATE TYPE "order_status_enum" AS ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "firstName" varchar(100) NOT NULL,
        "lastName" varchar(100) NOT NULL,
        "age" int NOT NULL,
        "email" varchar(255) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "price" decimal(10,2) NOT NULL,
        "stock" int NOT NULL DEFAULT 0,
        "version" int NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "status" "order_status_enum" NOT NULL DEFAULT 'pending',
        "totalPrice" decimal(12,2) NOT NULL DEFAULT 0,
        "idempotencyKey" varchar(255) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_orders_idempotency" UNIQUE ("userId", "idempotencyKey"),
        CONSTRAINT "FK_orders_userId" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderId" uuid NOT NULL,
        "productId" uuid,
        "quantity" int NOT NULL,
        "price" decimal(10,2) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_items_orderId" FOREIGN KEY ("orderId")
          REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_items_productId" FOREIGN KEY ("productId")
          REFERENCES "products"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_orders_userId_status_createdAt"
        ON "orders" ("userId", "status", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_orders_userId_status_createdAt"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "order_status_enum"`);
  }
}
