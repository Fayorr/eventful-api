import { Request, Response } from 'express';
import * as authService from './auth.service';

export const register = async (req: Request, res: Response) => {
	const data = await authService.registerUser(req.body);
	res.status(201).json({ status: 'success', data });
};

export const login = async (req: Request, res: Response) => {
	const data = await authService.loginUser(req.body);
	res.status(200).json({ status: 'success', data });
};

export const refresh = async (req: Request, res: Response) => {
	const data = await authService.refreshSession(req.body);
	res.status(200).json({ status: 'success', data });
};

export const resendVerification = async (req: Request, res: Response) => {
	const data = await authService.resendVerification(req.body);
	res.status(200).json({ status: 'success', data });
};
