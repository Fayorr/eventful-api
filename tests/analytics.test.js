"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("../src/app"));
const event_model_1 = __importDefault(require("../src/modules/events/event.model"));
const user_model_1 = __importDefault(require("../src/modules/auth/user.model"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let creatorToken;
let eventId;
beforeAll(async () => {
    const workerId = process.env.JEST_WORKER_ID || '4';
    await mongoose_1.default.connect(process.env.TEST_MONGO_URI ||
        `mongodb://localhost:27017/eventful_test_analytics_${workerId}`);
    const creatorRes = await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/register').send({
        name: 'Creator',
        email: 'an@test.com',
        password: 'pass',
        role: 'creator',
    });
    creatorToken = creatorRes.body.data.token;
    const eventRes = await (0, supertest_1.default)(app_1.default)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
        title: 'Stats Event',
        description: 'Stats',
        date: '2026-10-10T10:00:00Z',
        location: 'Virtual',
        price: 1000,
        capacity: 50,
    });
    eventId = eventRes.body.data._id;
}, 60000);
afterAll(async () => {
    await event_model_1.default.deleteMany({});
    await user_model_1.default.deleteMany({});
    await mongoose_1.default.connection.close();
}, 60000);
describe('Analytics Endpoints', () => {
    it('should get global analytics for creator', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/analytics/global')
            .set('Authorization', `Bearer ${creatorToken}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.data).toBeDefined();
    });
    it('should get specific event analytics', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get(`/api/v1/analytics/event/${eventId}`)
            .set('Authorization', `Bearer ${creatorToken}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.data).toBeDefined();
    });
});
