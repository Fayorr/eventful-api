import { UserRole } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../config/prisma';
import { createSupabaseClient } from '../../config/supabase';
import { FRONTEND_URL } from '../../config/urls';
import { AppError } from '../../shared/errors/AppError';

const registerSchema = z.object({
	name: z.string().trim().min(2).max(100),
	email: z.email().transform((email) => email.toLowerCase()),
	password: z.string().min(8).max(72),
	role: z.enum(['creator', 'eventee']).default('eventee'),
});

const loginSchema = z.object({
	email: z.email().transform((email) => email.toLowerCase()),
	password: z.string().min(1),
});

const toApiRole = (role: UserRole) => role.toLowerCase() as 'creator' | 'eventee';

const authError = (message: string) => {
	if (/email not confirmed/i.test(message)) {
		return new AppError(
			'Please confirm your email address before logging in.',
			403,
			'EMAIL_NOT_CONFIRMED',
		);
	}
	if (/invalid login credentials/i.test(message)) {
		return new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
	}
	return new AppError(message, 400, 'AUTH_ERROR');
};

export const registerUser = async (input: unknown) => {
	const data = registerSchema.parse(input);
	const existingProfile = await prisma.profile.findUnique({
		where: { email: data.email },
		select: { id: true },
	});

	if (existingProfile) {
		throw new AppError('Email is already registered.', 409, 'EMAIL_TAKEN');
	}

	const { data: authData, error } = await createSupabaseClient().auth.signUp({
		email: data.email,
		password: data.password,
		options: {
			emailRedirectTo: `${FRONTEND_URL}/verify-email`,
			data: { name: data.name },
		},
	});

	if (error) throw authError(error.message);
	if (!authData.user) throw new AppError('Unable to create account.', 502);

	const profile = await prisma.profile.create({
		data: {
			id: authData.user.id,
			email: data.email,
			name: data.name,
			role: data.role === 'creator' ? UserRole.CREATOR : UserRole.EVENTEE,
		},
	});

	return {
		message: 'Registration successful. Check your email to confirm your account.',
		user: {
			id: profile.id,
			name: profile.name,
			email: profile.email,
			role: toApiRole(profile.role),
		},
	};
};

export const loginUser = async (input: unknown) => {
	const data = loginSchema.parse(input);
	const { data: authData, error } =
		await createSupabaseClient().auth.signInWithPassword(data);

	if (error) throw authError(error.message);
	if (!authData.session || !authData.user.email) {
		throw new AppError('Unable to create a session.', 502);
	}

	const profile = await prisma.profile.findUnique({
		where: { id: authData.user.id },
	});
	if (!profile) {
		throw new AppError('Account profile is missing.', 403, 'PROFILE_MISSING');
	}

	return {
		user: {
			id: profile.id,
			name: profile.name,
			email: profile.email,
			role: toApiRole(profile.role),
		},
		token: authData.session.access_token,
		refreshToken: authData.session.refresh_token,
		expiresAt: authData.session.expires_at
			? new Date(authData.session.expires_at * 1000).toISOString()
			: null,
	};
};

export const refreshSession = async (input: unknown) => {
	const { refreshToken } = z
		.object({ refreshToken: z.string().min(1) })
		.parse(input);
	const { data, error } = await createSupabaseClient().auth.refreshSession({
		refresh_token: refreshToken,
	});

	if (error || !data.session) {
		throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_REFRESH');
	}

	return {
		token: data.session.access_token,
		refreshToken: data.session.refresh_token,
		expiresAt: data.session.expires_at
			? new Date(data.session.expires_at * 1000).toISOString()
			: null,
	};
};

export const resendVerification = async (input: unknown) => {
	const { email } = z
		.object({ email: z.email().transform((value) => value.toLowerCase()) })
		.parse(input);
	const { error } = await createSupabaseClient().auth.resend({
		type: 'signup',
		email,
		options: { emailRedirectTo: `${FRONTEND_URL}/verify-email` },
	});

	if (error) throw authError(error.message);
	return { message: 'If the account exists, a confirmation email has been sent.' };
};
