"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("../src/app"));
const user_model_1 = __importDefault(require("../src/modules/auth/user.model"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
beforeAll(async () => {
    // FIX: Append JEST_WORKER_ID so parallel tests don't overwrite the same database
    const workerId = process.env.JEST_WORKER_ID || '1';
    await mongoose_1.default.connect(process.env.TEST_MONGO_URI ||
        `mongodb://localhost:27017/eventful_test_auth_${workerId}`);
}, 60000);
afterAll(async () => {
    await user_model_1.default.deleteMany({});
    await mongoose_1.default.connection.close();
}, 60000);
describe('Auth Endpoints', () => {
    it('should register a new user successfully', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/register').send({
            name: 'Test Creator',
            email: 'creator@test.com',
            password: 'password123',
            role: 'creator',
        });
        expect(res.statusCode).toEqual(201);
        expect(res.body.status).toBe('success');
        expect(res.body.data).toHaveProperty('token');
    });
    it('should login successfully with valid credentials', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/login').send({
            email: 'creator@test.com',
            password: 'password123',
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data).toHaveProperty('token');
    });
    it('should not login with incorrect password', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/login').send({
            email: 'creator@test.com',
            password: 'wrongpassword',
        });
        expect(res.statusCode).toEqual(401);
    });
});
