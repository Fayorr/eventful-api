/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	setupFiles: ['<rootDir>/tests/setup.ts'],
	testMatch: ['**/**/*.test.ts'],
	verbose: true,
	forceExit: false,
	clearMocks: true,
	resetMocks: false,
	restoreMocks: false,
};
