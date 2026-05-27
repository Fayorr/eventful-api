import { Request, Response, NextFunction } from 'express';

// Extend the native Error interface to include common MongoDB/JWT properties
export interface AppError extends Error {
	statusCode?: number;
	code?: number;
	keyValue?: any;
	errors?: any;
}

export const errorHandler = (
	err: AppError,
	req: Request,
	res: Response,
	next: NextFunction,
): void => {
	let defaultError = {
		statusCode: err.statusCode || 500,
		message: err.message || 'Something went wrong on the server',
	};

	// 1. Mongoose Bad ObjectId (e.g., searching for an event with an invalid ID)
	if (err.name === 'CastError') {
		defaultError.statusCode = 400;
		defaultError.message = 'Resource not found or invalid ID format';
	}

	// 2. Mongoose Duplicate Key (e.g., registering an email that already exists)
	if (err.code === 11000) {
		defaultError.statusCode = 400;
		const field = Object.keys(err.keyValue || {})[0];
		defaultError.message = `${field} already exists. Please use another value.`;
	}

	// 3. Mongoose Validation Error (e.g., missing required fields)
	if (err.name === 'ValidationError') {
		defaultError.statusCode = 400;
		const messages = Object.values(err.errors).map((val: any) => val.message);
		defaultError.message = messages.join('. ');
	}

	// 4. JWT Errors
	if (err.name === 'JsonWebTokenError') {
		defaultError.statusCode = 401;
		defaultError.message = 'Invalid token. Please log in again.';
	}

	if (err.name === 'TokenExpiredError') {
		defaultError.statusCode = 401;
		defaultError.message = 'Your token has expired. Please log in again.';
	}

	// Send the formatted error response
	res.status(defaultError.statusCode).json({
		status: 'error',
		message: defaultError.message,
		// Only show the detailed stack trace if running in development mode
		stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
	});
};
