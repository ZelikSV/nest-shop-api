import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { PaymentsService } from './payments.service';

function parseDelayMs(val: string | undefined): number {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

async function maybeDelay(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @GrpcMethod('Payments', 'Authorize')
  async authorize(data: {
    orderId: string;
    amount: number;
    currency: string;
    idempotencyKey: string;
  }) {
    const delayMs =
      parseDelayMs(process.env.PAYMENTS_DELAY_AUTHORIZE_MS) ||
      parseDelayMs(process.env.PAYMENTS_ARTIFICIAL_DELAY_MS);
    await maybeDelay(delayMs);
    return this.paymentsService.authorize(data);
  }

  @GrpcMethod('Payments', 'GetPaymentStatus')
  async getPaymentStatus(data: { paymentId: string }) {
    const delayMs =
      parseDelayMs(process.env.PAYMENTS_DELAY_STATUS_MS) ||
      parseDelayMs(process.env.PAYMENTS_ARTIFICIAL_DELAY_MS);
    await maybeDelay(delayMs);
    return this.paymentsService.getPaymentStatus(data);
  }

  @GrpcMethod('Payments', 'Capture')
  async capture(data: { paymentId: string }) {
    const delayMs = parseDelayMs(process.env.PAYMENTS_ARTIFICIAL_DELAY_MS);
    await maybeDelay(delayMs);
    return this.paymentsService.capture(data);
  }

  @GrpcMethod('Payments', 'Refund')
  async refund(data: { paymentId: string }) {
    const delayMs = parseDelayMs(process.env.PAYMENTS_ARTIFICIAL_DELAY_MS);
    await maybeDelay(delayMs);
    return this.paymentsService.refund(data);
  }
}
