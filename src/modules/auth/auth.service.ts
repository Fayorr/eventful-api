import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail } from '../notifications/email.service';
import jwt from 'jsonwebtoken';
import User, { IUser } from './user.model';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretfallback';

export const registerUser = async (data: Partial<IUser>) => {
	const existingUser = await User.findOne({ email: data.email });
	if (existingUser) {
		throw new Error('Email is already registered');
	}

	const salt = await bcrypt.genSalt(10);
	const hashedPassword = await bcrypt.hash(data.password as string, salt);

	// 1. Generate a secure random token for email verification
	const verificationToken = crypto.randomBytes(32).toString('hex');

	// 2. Set expiration for 24 hours from now
	const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

	// 3. Create the user with the new verification fields
	const user = await User.create({
		...data,
		password: hashedPassword,
		emailVerificationToken: verificationToken,
		emailVerificationExpires: tokenExpires,
	});

	// 4. Send the verification email via Resend
	await sendVerificationEmail(user.email, user.name, verificationToken);

	// 5. Return success message INSTEAD of logging them in with a JWT
	return {
		message:
			'Registration successful! Please check your email to verify your account.',
	};
};

export const loginUser = async (data: Partial<IUser>) => {
	const user = await User.findOne({ email: data.email }).select('+password');
	if (!user) {
		throw new Error('Invalid credentials');
	}

	// 🛑 BLOCK LOGIN IF NOT VERIFIED
	if (!user.isEmailVerified) {
		throw new Error(
			'Please verify your email address before logging in. Check your inbox!',
		);
	}

	const isMatch = await bcrypt.compare(
		data.password as string,
		user.password as string,
	);
	if (!isMatch) {
		throw new Error('Invalid credentials');
	}

	return generateToken(user);
};

const generateToken = (user: IUser) => {
	const expiresIn = '2d';
	const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
		expiresIn,
	});

	// Calculate expiry timestamp
	const expiryTime = new Date();
	expiryTime.setDate(expiryTime.getDate() + 2); // 1 day from now

	return {
		user: { id: user._id, name: user.name, email: user.email, role: user.role },
		token,
		expiresAt: expiryTime.toISOString(),
	};
};
