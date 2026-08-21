export type ProviderPaymentStatus = "REQUIRES_ACTION" | "AUTHORIZED" | "CAPTURED";
export type ProviderRefundStatus = "PENDING" | "COMPLETED";

export type ProviderCreatePaymentRequest = Readonly<{
  attemptId: string;
  bookingId: string;
  bookingReference: string;
  amount: number;
  currency: string;
  returnUrl: string;
  guestEmail: string;
}>;

export type ProviderCreatePaymentResult = Readonly<{
  externalPaymentId: string;
  status: ProviderPaymentStatus;
  redirectUrl?: string | null;
}>;

export type ProviderRefundRequest = Readonly<{
  refundId: string;
  externalPaymentId: string;
  amount: number;
  currency: string;
}>;

export type ProviderRefundResult = Readonly<{
  externalRefundId: string;
  status: ProviderRefundStatus;
}>;

export interface PaymentProvider {
  readonly key: string;
  createPayment(request: ProviderCreatePaymentRequest): Promise<ProviderCreatePaymentResult>;
  refundPayment(request: ProviderRefundRequest): Promise<ProviderRefundResult>;
}
