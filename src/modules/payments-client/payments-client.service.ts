import {
  Inject,
  Injectable,
  OnModuleInit,
  GatewayTimeoutException,
  NotFoundException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { type ClientGrpc } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import {
  type Observable,
  TimeoutError,
  firstValueFrom,
  timeout,
  catchError,
  throwError,
  retry,
  timer,
} from 'rxjs';

import { PAYMENTS_GRPC_CLIENT } from './payments-client.constants';

interface AuthorizeRequest {
  orderId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

interface AuthorizeResponse {
  paymentId: string;
  status: string;
}

interface GetPaymentStatusRequest {
  paymentId: string;
}

interface GetPaymentStatusResponse {
  paymentId: string;
  status: string;
}

interface PaymentsGrpcService {
  authorize(data: AuthorizeRequest): Observable<AuthorizeResponse>;
  getPaymentStatus(data: GetPaymentStatusRequest): Observable<GetPaymentStatusResponse>;
}

interface GrpcError {
  code?: number;
  message?: string;
}

// gRPC status codes
const GRPC_NOT_FOUND = 5;
const GRPC_UNAVAILABLE = 14;
const GRPC_DEADLINE_EXCEEDED = 4;

const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 500;

@Injectable()
export class PaymentsClientService implements OnModuleInit {
  private paymentsGrpc: PaymentsGrpcService;

  constructor(
    @Inject(PAYMENTS_GRPC_CLIENT) private readonly client: ClientGrpc,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.paymentsGrpc = this.client.getService<PaymentsGrpcService>('Payments');
  }

  async authorize(data: AuthorizeRequest): Promise<AuthorizeResponse> {
    const timeoutMs = Number(this.config.get('PAYMENTS_GRPC_TIMEOUT_MS', '5000'));

    return firstValueFrom(
      this.paymentsGrpc.authorize(data).pipe(
        timeout(timeoutMs),
        retry({
          count: RETRY_COUNT,
          delay: (err: unknown, attempt) => {
            const grpcErr = err as GrpcError;
            if (grpcErr?.code !== GRPC_UNAVAILABLE) {
              return throwError(() => err);
            }
            return timer(RETRY_DELAY_MS * attempt);
          },
        }),
        catchError((err: unknown) => {
          if (err instanceof TimeoutError) {
            return throwError(() => new GatewayTimeoutException('Payments service timeout'));
          }
          return throwError(() => this.mapGrpcError(err as GrpcError));
        }),
      ),
    );
  }

  async getPaymentStatus(data: GetPaymentStatusRequest): Promise<GetPaymentStatusResponse> {
    const timeoutMs = Number(this.config.get('PAYMENTS_GRPC_TIMEOUT_MS', '5000'));

    return firstValueFrom(
      this.paymentsGrpc.getPaymentStatus(data).pipe(
        timeout(timeoutMs),
        retry({
          count: RETRY_COUNT,
          delay: (err: unknown, attempt) => {
            const grpcErr = err as GrpcError;
            if (grpcErr?.code !== GRPC_UNAVAILABLE) {
              return throwError(() => err);
            }
            return timer(RETRY_DELAY_MS * attempt);
          },
        }),
        catchError((err: unknown) => {
          if (err instanceof TimeoutError) {
            return throwError(() => new GatewayTimeoutException('Payments service timeout'));
          }
          return throwError(() => this.mapGrpcError(err as GrpcError));
        }),
      ),
    );
  }

  private mapGrpcError(err: GrpcError): Error {
    if (err?.code === GRPC_NOT_FOUND) {
      return new NotFoundException(err.message ?? 'Payment not found');
    }
    if (err?.code === GRPC_UNAVAILABLE) {
      return new ServiceUnavailableException('Payments service unavailable');
    }
    if (err?.code === GRPC_DEADLINE_EXCEEDED) {
      return new GatewayTimeoutException('Payments service deadline exceeded');
    }
    return new InternalServerErrorException(err.message ?? 'Payments service error');
  }
}
