import { NextFunction, Request, Response } from 'express';
import prisma from '../../config/prisma';
import { createSupabaseClient } from '../../config/supabase';

export type ApiRole = 'creator' | 'eventee';

export interface AuthUser {
	id: string;
	email: string;
	name: string;
	role: ApiRole;
}

export interface AuthRequest extends Request {
	user?: AuthUser;
}

export const protect = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
	if (scheme !== 'Bearer' || !token) {
		res.status(401).json({
			status: 'error',
			message: 'A Bearer access token is required.',
		});
		return;
	}

	const { data, error } = await createSupabaseClient().auth.getUser(token);
	if (error || !data.user?.email || !data.user.email_confirmed_at) {
		res.status(401).json({ status: 'error', message: 'Invalid access token.' });
		return;
	}

	const profile = await prisma.profile.findUnique({ where: { id: data.user.id } });
	if (!profile) {
		res.status(403).json({ status: 'error', message: 'Account profile not found.' });
		return;
	}

	req.user = {
		id: profile.id,
		email: profile.email,
		name: profile.name,
		role: profile.role.toLowerCase() as ApiRole,
	};
	next();
};

export const authorize = (...roles: ApiRole[]) =>
	(req: AuthRequest, res: Response, next: NextFunction): void => {
		if (!req.user || !roles.includes(req.user.role)) {
			res.status(403).json({
				status: 'error',
				message: 'Your account is not allowed to perform this action.',
			});
			return;
		}
		next();
	};
