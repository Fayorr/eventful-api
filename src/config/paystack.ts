const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const secretKey = () => {
	const value = process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET;
	if (!value) throw new Error('PAYSTACK_SECRET_KEY is not configured');
	return value;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
	const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${secretKey()}`,
			'Content-Type': 'application/json',
			...init?.headers,
		},
	});
	const body = (await response.json()) as {
		status: boolean;
		message?: string;
		data?: T;
	};
	if (!response.ok || !body.status || !body.data) {
		throw new Error(body.message || 'Paystack request failed');
	}
	return body.data;
};

export interface PaystackVerification {
	status: string;
	reference: string;
	amount: number;
	currency: string;
	paid_at?: string;
	metadata?: Record<string, unknown>;
	[key: string]: unknown;
}

export const paystack = {
	initializePayment(
		email: string,
		amountKobo: number,
		reference: string,
		metadata: Record<string, string>,
		callbackUrl: string,
	) {
		return request<{
			authorization_url: string;
			access_code: string;
			reference: string;
		}>('/transaction/initialize', {
			method: 'POST',
			body: JSON.stringify({
				email,
				amount: amountKobo,
				reference,
				callback_url: callbackUrl,
				metadata,
			}),
		});
	},

	verifyPayment(reference: string) {
		return request<PaystackVerification>(
			`/transaction/verify/${encodeURIComponent(reference)}`,
		);
	},
};
