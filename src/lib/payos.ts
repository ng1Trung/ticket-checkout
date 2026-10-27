import { PayOS } from '@payos/node';

const clientId = process.env.PAYOS_CLIENT_ID || '';
const apiKey = process.env.PAYOS_API_KEY || '';
const checksumKey = process.env.PAYOS_CHECKSUM_KEY || '';

export const isPayOSConfigured =
  Boolean(clientId && apiKey && checksumKey) &&
  clientId !== 'sample_client_id' &&
  clientId !== 'your_payos_client_id';

let payosInstance: PayOS | null = null;

if (isPayOSConfigured) {
  try {
    payosInstance = new PayOS({
      clientId,
      apiKey,
      checksumKey,
    });
  } catch (error) {
    console.error('[PayOS] Failed to initialize PayOS client:', error);
  }
}

export const payos = payosInstance;

export interface CreatePaymentParams {
  orderCode: number;
  amount: number;
  description: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  returnUrl: string;
  cancelUrl: string;
}

export async function createPaymentSession(params: CreatePaymentParams) {
  if (isPayOSConfigured && payos) {
    // 1. Live PayOS Sandbox
    const response = await payos.paymentRequests.create({
      orderCode: params.orderCode,
      amount: params.amount,
      description: params.description.slice(0, 25), // PayOS imposes a 25-character max limit
      items: params.items,
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl,
    });

    return {
      mode: 'PAYOS_SANDBOX' as const,
      checkoutUrl: (response as any).checkoutUrl || (response as any).paymentUrl,
      orderCode: params.orderCode,
      paymentLinkId: (response as any).paymentLinkId,
    };
  }

  // 2. Built-in Sandbox Simulator fallback when API keys are not yet configured
  const fallbackUrl = `/checkout/sandbox-simulator?orderCode=${params.orderCode}&amount=${params.amount}&desc=${encodeURIComponent(
    params.description
  )}`;

  return {
    mode: 'SIMULATOR' as const,
    checkoutUrl: fallbackUrl,
    orderCode: params.orderCode,
    paymentLinkId: `sim_${params.orderCode}`,
  };
}
