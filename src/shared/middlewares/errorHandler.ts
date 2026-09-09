import { Prisma } from '@prisma/client';
import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
	let statusCode = 500;
	let code = 'INTERNAL_ERROR';
	let message = 'Something went wrong on the server.';
	let details: unknown;

	if (error instanceof AppError) {
		statusCode = error.statusCode;
		code = error.code || 'APPLICATION_ERROR';
		message = error.message;
	} else if (error instanceof ZodError) {
		statusCode = 400;
		code = 'VALIDATION_ERROR';
		message = 'The request contains invalid data.';
		details = error.issues.map((issue) => ({
			path: issue.path.join('.'),
			message: issue.message,
		}));
	} else if (error instanceof Prisma.PrismaClientKnownRequestError) {
		if (error.code === 'P2002') {
			statusCode = 409;
			code = 'DUPLICATE_RESOURCE';
			message = 'This resource already exists.';
		} else if (error.code === 'P2025') {
			statusCode = 404;
			code = 'RESOURCE_NOT_FOUND';
			message = 'Resource not found.';
		}
	}

	if (statusCode >= 500) console.error(error);
	res.status(statusCode).json({
		status: 'error',
		code,
		message,
		...(details ? { details } : {}),
	});
};
