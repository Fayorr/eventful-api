const profile = {
	findUnique: jest.fn(),
	create: jest.fn(),
};
const signUp = jest.fn();
const signInWithPassword = jest.fn();
const refreshSession = jest.fn();
const resend = jest.fn();

jest.mock('../src/config/prisma', () => ({
	__esModule: true,
	default: { profile },
}));
jest.mock('../src/config/supabase', () => ({
	createSupabaseClient: () => ({
		auth: { signUp, signInWithPassword, refreshSession, resend },
	}),
}));

import { loginUser, registerUser } from '../src/modules/auth/auth.service';

describe('auth service', () => {
	beforeEach(() => jest.clearAllMocks());

	it('registers without creating a session before email confirmation', async () => {
		profile.findUnique.mockResolvedValue(null);
		signUp.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null });
		profile.create.mockResolvedValue({
			id: 'user-id',
			name: 'Ada Lovelace',
			email: 'ada@example.com',
			role: 'EVENTEE',
		});

		const result = await registerUser({
			name: 'Ada Lovelace',
			email: 'ADA@example.com',
			password: 'correct-horse-battery-staple',
			role: 'eventee',
		});

		expect(result).not.toHaveProperty('token');
		expect(result.message).toMatch(/confirm/i);
		expect(signUp).toHaveBeenCalledWith(
			expect.objectContaining({ email: 'ada@example.com' }),
		);
	});

	it('blocks login when Supabase reports an unconfirmed email', async () => {
		signInWithPassword.mockResolvedValue({
			data: { session: null, user: null },
			error: { message: 'Email not confirmed' },
		});
		await expect(
			loginUser({ email: 'ada@example.com', password: 'password' }),
		).rejects.toMatchObject({ statusCode: 403, code: 'EMAIL_NOT_CONFIRMED' });
	});
});
