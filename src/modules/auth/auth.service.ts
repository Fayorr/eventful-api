import bcrypt from 'bcryptjs';
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

	const user = await User.create({
		...data,
		password: hashedPassword,
	});

	return generateToken(user);
};

export const loginUser = async (data: Partial<IUser>) => {
	const user = await User.findOne({ email: data.email }).select('+password');
	if (!user) {
		throw new Error('Invalid credentials');
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
	const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
		expiresIn: '1d',
	});

	return {
		user: { id: user._id, name: user.name, email: user.email, role: user.role },
		token,
	};
};
