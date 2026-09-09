import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getRequired = (name: string) => {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is not configured`);
	return value;
};

export const createSupabaseClient = (): SupabaseClient =>
	createClient(
		getRequired('SUPABASE_URL'),
		process.env.SUPABASE_PUBLISHABLE_KEY || getRequired('SUPABASE_ANON_KEY'),
		{
			auth: {
				autoRefreshToken: false,
				persistSession: false,
				detectSessionInUrl: false,
			},
		},
	);
