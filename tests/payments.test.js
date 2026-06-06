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
let creatorToken;
beforeAll(async () => {
    const workerId = process.env.JEST_WORKER_ID || '5';
    await mongoose_1.default.connect(process.env.TEST_MONGO_URI ||
        `mongodb://localhost:27017/eventful_test_payments_${workerId}`);
    const creatorRes = await (0, supertest_1.default)(app_1.default)
        .post('/api/v1/auth/register')
        .send({
        name: 'Finance Creator',
        email: `finance_creator_${workerId}@test.com`,
        password: 'pass',
        role: 'creator',
    });
    creatorToken = creatorRes.body.data.token;
}, 30000);
afterAll(async () => {
    await user_model_1.default.deleteMany({});
    await mongoose_1.default.connection.close();
});
describe('Payments Ledger Endpoints', () => {
    it('should retrieve payment history for creator', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/payments/history')
            .set('Authorization', `Bearer ${creatorToken}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data).toHaveProperty('totalRevenue');
        expect(res.body.data).toHaveProperty('transactions');
    });
});
//     throw new Error('Function not implemented.');
// }
// function expect(statusCode: number) {
//     throw new Error('Function not implemented.');
// }
