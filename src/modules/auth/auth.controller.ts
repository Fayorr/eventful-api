import { Request, Response } from 'express';
import * as authService from './auth.service';
import User, { IUser } from './user.model';

export const register = async (req: Request, res: Response) => {
	try {
		const result = await authService.registerUser(req.body);
		res.status(201).json({ status: 'success', data: result });
	} catch (error: any) {
		res.status(400).json({ status: 'error', message: error.message });
	}
};

export const login = async (req: Request, res: Response) => {
	try {
		const result = await authService.loginUser(req.body);
		res.status(200).json({ status: 'success', data: result });
	} catch (error: any) {
		res.status(401).json({ status: 'error', message: error.message });
	}
};
export const verifyEmail = async (req: Request, res: Response) => {
	try {
		const { token } = req.params;

		// Find user with this token, ensuring the token hasn't expired
		const user = await User.findOne({
			emailVerificationToken: token,
			emailVerificationExpires: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({
				status: 'error',
				message:
					'Invalid or expired verification token. Please register again or request a new link.',
			});
		}

		
		user.isEmailVerified = true;
		user.emailVerificationToken = undefined;
		user.emailVerificationExpires = undefined;
		await user.save();

		res.status(200).json({
			status: 'success',
			message: 'Email verified successfully! You can now log in.',
		});
	} catch (error: any) {
		res.status(500).json({ status: 'error', message: error.message });
	}
};