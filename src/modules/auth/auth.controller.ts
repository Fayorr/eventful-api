import { Request, Response } from 'express';
import * as authService from './auth.service';

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
