import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { v4 as uuidv4 } from 'uuid';

interface PaymentRecord {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
}

@Injectable()
export class PaymentsService {
  private readonly payments = new Map<string, PaymentRecord>();
  private readonly idempotencyIndex = new Map<string, string>();

  authorize(data: { orderId: string; amount: number; currency: string; idempotencyKey: string }): {
    paymentId: string;
    status: string;
  } {
    if (data.idempotencyKey && this.idempotencyIndex.has(data.idempotencyKey)) {
      const existingId = this.idempotencyIndex.get(data.idempotencyKey)!;
      const existing = this.payments.get(existingId)!;
      return { paymentId: existing.paymentId, status: existing.status };
    }

    const paymentId = uuidv4();
    const record: PaymentRecord = {
      paymentId,
      orderId: data.orderId,
      amount: data.amount,
      currency: data.currency,
      status: 'AUTHORIZED',
    };

    this.payments.set(paymentId, record);

    if (data.idempotencyKey) {
      this.idempotencyIndex.set(data.idempotencyKey, paymentId);
    }

    return { paymentId, status: record.status };
  }

  getPaymentStatus(data: { paymentId: string }): { paymentId: string; status: string } {
    const record = this.payments.get(data.paymentId);

    if (!record) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Payment ${data.paymentId} not found`,
      });
    }

    return { paymentId: record.paymentId, status: record.status };
  }

  capture(data: { paymentId: string }): { paymentId: string; status: string } {
    const record = this.payments.get(data.paymentId);

    if (!record) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Payment ${data.paymentId} not found`,
      });
    }

    record.status = 'CAPTURED';
    return { paymentId: record.paymentId, status: record.status };
  }

  refund(data: { paymentId: string }): { paymentId: string; status: string } {
    const record = this.payments.get(data.paymentId);

    if (!record) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Payment ${data.paymentId} not found`,
      });
    }

    record.status = 'REFUNDED';
    return { paymentId: record.paymentId, status: record.status };
  }
}
