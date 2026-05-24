import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretfallback';

export interface AuthRequest extends Request {
	user?: any;
}

export const protect = (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
): void => {
	const token = req.headers.authorization?.split(' ')[1];

	if (!token) {
		res
			.status(401)
			.json({ status: 'error', message: 'Not authorized, no token provided' });
		return;
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		req.user = decoded;
		next();
	} catch (error) {
		res
			.status(401)
			.json({ status: 'error', message: 'Not authorized, token failed' });
	}
};

export const authorize = (...roles: string[]) => {
	return (req: AuthRequest, res: Response, next: NextFunction): void => {
		if (!req.user || !roles.includes(req.user.role)) {
			res
				.status(403)
				.json({
					status: 'error',
					message: 'User role not authorized to access this route',
				});
			return;
		}
		next();
	};
};
