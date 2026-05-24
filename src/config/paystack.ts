import dotenv from 'dotenv';

dotenv.config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY as string;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export const paystack = {
	/**
	 * Initializes a transaction with Paystack
	 */
	async initializePayment(email: string, amount: number, metadata: any) {
		const response = await fetch(
			`${PAYSTACK_BASE_URL}/transaction/initialize`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email,
					amount: amount * 100, // Paystack expects amount in kobo/cents
					metadata,
				}),
			},
		);

		const data = await response.json();
		if (!response.ok)
			throw new Error(data.message || 'Payment initialization failed');
		return data.data;
	},

	/**
	 * Verifies a transaction with Paystack
	 */
	async verifyPayment(reference: string) {
		const response = await fetch(
			`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
				},
			},
		);

		const data = await response.json();
		if (!response.ok)
			throw new Error(data.message || 'Payment verification failed');
		return data.data;
	},
};
