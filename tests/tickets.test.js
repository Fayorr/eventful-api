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
const ticket_model_1 = __importDefault(require("../src/modules/tickets/ticket.model"));
const dotenv_1 = __importDefault(require("dotenv"));
// 1. Mock External Services
jest.mock('../src/config/paystack', () => ({
    paystack: {
        initializePayment: jest.fn().mockResolvedValue({
            authorization_url: 'https://mock-paystack.com/checkout',
            reference: 'mock-ref-123',
        }),
        verifyPayment: jest.fn().mockResolvedValue({
            status: 'success',
            metadata: { eventId: 'mock_event_id', userId: 'mock_user_id' },
        }),
    },
}));
jest.mock('../src/shared/utils/qrGenerator', () => ({
    generateQRCode: jest
        .fn()
        .mockResolvedValue('https://mock-cloudinary.com/qr.png'),
}));
jest.mock('../src/modules/notifications/queue.service', () => ({
    scheduleReminder: jest.fn().mockResolvedValue(true),
}));
dotenv_1.default.config();
let creatorToken;
let creatorId;
let attendeeToken;
let attendeeId;
let paidEventId;
let freeEventId;
let ticketId;
beforeAll(async () => {
    const workerId = process.env.JEST_WORKER_ID || '3';
    await mongoose_1.default.connect(process.env.TEST_MONGO_URI ||
        `mongodb://localhost:27017/eventful_test_tickets_${workerId}`);
    // Setup Creator
    const creatorRes = await (0, supertest_1.default)(app_1.default)
        .post('/api/v1/auth/register')
        .send({
        name: 'Ticket Creator',
        email: `ticket_creator_${workerId}@test.com`,
        password: 'pass',
        role: 'creator',
    });
    creatorToken = creatorRes.body.data.token;
    creatorId = creatorRes.body.data.user.id;
    // Setup Attendee
    const attendeeRes = await (0, supertest_1.default)(app_1.default)
        .post('/api/v1/auth/register')
        .send({
        name: 'Ticket Attendee',
        email: `ticket_attendee_${workerId}@test.com`,
        password: 'pass',
        role: 'eventee',
    });
    attendeeToken = attendeeRes.body.data.token;
    attendeeId = attendeeRes.body.data.user.id;
    // Create a Paid Event
    const paidEventRes = await (0, supertest_1.default)(app_1.default)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
        title: 'Paid Event',
        description: '$$$',
        date: '2026-10-10T10:00:00Z',
        location: 'Virtual',
        price: 1000,
        capacity: 50,
    });
    paidEventId = paidEventRes.body.data._id;
    // Create a Free Event
    const freeEventRes = await (0, supertest_1.default)(app_1.default)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
        title: 'Free Event',
        description: 'Free',
        date: '2026-10-11T10:00:00Z',
        location: 'Virtual',
        price: 0,
        capacity: 50,
    });
    freeEventId = freeEventRes.body.data._id;
}, 60000);
afterAll(async () => {
    await event_model_1.default.deleteMany({});
    await user_model_1.default.deleteMany({});
    await ticket_model_1.default.deleteMany({});
    await mongoose_1.default.connection.close();
}, 60000);
describe('Ticket & Checkout Endpoints', () => {
    it('should initialize Paystack for a paid event', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/tickets/buy/${paidEventId}`)
            .set('Authorization', `Bearer ${attendeeToken}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.data).toHaveProperty('authorization_url');
        expect(res.body.data.reference).toBe('mock-ref-123');
    });
    it('should generate ticket directly for a free event', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/tickets/buy/${freeEventId}`)
            .set('Authorization', `Bearer ${attendeeToken}`);
        expect(res.statusCode).toEqual(200);
        // Because it's free, the service returns the ticket object directly
        expect(res.body.data).toHaveProperty('qrCodeUrl');
        ticketId = res.body.data._id;
    });
    it('should allow the creator to scan and validate a ticket', async () => {
        // Find the reference of the free ticket we just bought
        const ticket = await ticket_model_1.default.findById(ticketId);
        const res = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/tickets/scan/${ticket?.paymentReference}`)
            .set('Authorization', `Bearer ${creatorToken}`); // Must be scanned by creator
        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toContain('Ticket verified');
    });
    it('should reject scan if already scanned', async () => {
        const ticket = await ticket_model_1.default.findById(ticketId);
        const res = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/tickets/scan/${ticket?.paymentReference}`)
            .set('Authorization', `Bearer ${creatorToken}`);
        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toBe('Ticket has already been scanned!');
    });
    it('should allow attendee to set a personal reminder', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/tickets/${ticketId}/reminder`)
            .set('Authorization', `Bearer ${attendeeToken}`)
            .send({ delayInHours: 24 });
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('success');
    });
});
