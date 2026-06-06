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
    const workerId = process.env.JEST_WORKER_ID || '2';
    await mongoose_1.default.connect(process.env.TEST_MONGO_URI ||
        `mongodb://localhost:27017/eventful_test_events_${workerId}`);
    const creatorRes = await (0, supertest_1.default)(app_1.default)
        .post('/api/v1/auth/register')
        .send({
        name: 'Event Creator',
        email: `event_creator_${workerId}@test.com`,
        password: 'password123',
        role: 'creator',
    });
    creatorToken = creatorRes.body.data.token;
}, 60000);
afterAll(async () => {
    await event_model_1.default.deleteMany({});
    await user_model_1.default.deleteMany({});
    await mongoose_1.default.connection.close();
}, 60000);
describe('Event Endpoints', () => {
    it('should create an event if authenticated as a creator', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/events')
            .set('Authorization', `Bearer ${creatorToken}`)
            .send({
            title: 'Backend Meetup',
            description: 'Tech talks.',
            date: '2026-08-15T10:00:00Z',
            location: 'Lagos',
            price: 5000,
            capacity: 150,
        });
        expect(res.statusCode).toEqual(201);
        expect(res.body.status).toBe('success');
        eventId = res.body.data._id; // Save for next tests
    });
    it('should fetch all events successfully', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/api/v1/events');
        expect(res.statusCode).toEqual(200);
        expect(res.body.data.length).toBeGreaterThan(0);
    });
    it('should fetch a single event by ID', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get(`/api/v1/events/${eventId}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.data.title).toBe('Backend Meetup');
    });
    it('should generate share links for an event', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get(`/api/v1/events/${eventId}/share`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.data).toHaveProperty('whatsapp');
        expect(res.body.data).toHaveProperty('twitter');
    });
});
