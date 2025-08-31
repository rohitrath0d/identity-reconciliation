import request from "supertest";
// import  {app}  from "../run.ts"; // Ensure app is exported from run.ts
import { app } from "../run.js"; // Ensure app is exported from run.ts
// import { prisma } from "../db/init_db.ts";
import { prisma } from "../db/init_db.js";
jest.mock("../db/init_db", () => ({
    prisma: {
        contact: {
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
    },
}));
describe("identificationProcess", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    it("should return 400 for an empty request", async () => {
        const response = await request(app).post("/identify").send({});
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            success: false,
            error: "Either email or phoneNumber is required",
        });
    });
    it("should create a new primary contact for a new customer", async () => {
        prisma.contact.findMany.mockResolvedValue([]);
        prisma.contact.create.mockResolvedValue({
            id: 1,
            email: "newuser@test.com",
            phoneNumber: "555000",
            linkedPrecedence: "primary",
        });
        const response = await request(app)
            .post("/identify")
            .send({ email: "newuser@test.com", phoneNumber: "555000" });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            contact: {
                primaryContactId: 1,
                emails: ["newuser@test.com"],
                phoneNumbers: ["555000"],
                secondaryContactIds: [],
            },
        });
    });
    it("should not create a new record for an exact duplicate", async () => {
        prisma.contact.findMany.mockResolvedValue([
            {
                id: 1,
                email: "newuser@test.com",
                phoneNumber: "555000",
                linkedPrecedence: "primary",
            },
        ]);
        const response = await request(app)
            .post("/identify")
            .send({ email: "newuser@test.com", phoneNumber: "555000" });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            contact: {
                primaryContactId: 1,
                emails: ["newuser@test.com"],
                phoneNumbers: ["555000"],
                secondaryContactIds: [],
            },
        });
    });
    it("should link a partial match (same email) as secondary", async () => {
        prisma.contact.findMany.mockResolvedValue([
            {
                id: 1,
                email: "newuser@test.com",
                phoneNumber: "555000",
                linkedPrecedence: "primary",
            },
        ]);
        const response = await request(app)
            .post("/identify")
            .send({ email: "newuser@test.com", phoneNumber: "555111" });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            contact: {
                primaryContactId: 1,
                emails: ["newuser@test.com"],
                phoneNumbers: ["555000", "555111"],
                secondaryContactIds: [],
            },
        });
    });
    it("should link a partial match (same phone) as secondary", async () => {
        prisma.contact.findMany.mockResolvedValue([
            {
                id: 1,
                email: "newuser@test.com",
                phoneNumber: "555000",
                linkedPrecedence: "primary",
            },
        ]);
        const response = await request(app)
            .post("/identify")
            .send({ email: "another@test.com", phoneNumber: "555000" });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            contact: {
                primaryContactId: 1,
                emails: ["newuser@test.com", "another@test.com"],
                phoneNumbers: ["555000"],
                secondaryContactIds: [],
            },
        });
    });
    it("should merge two primaries under the oldest primary", async () => {
        prisma.contact.findMany.mockResolvedValue([
            {
                id: 1,
                email: "alpha@test.com",
                phoneNumber: "111",
                linkedPrecedence: "primary",
                createdAt: new Date("2023-01-01"),
            },
            {
                id: 2,
                email: "beta@test.com",
                phoneNumber: "222",
                linkedPrecedence: "primary",
                createdAt: new Date("2023-02-01"),
            },
        ]);
        const response = await request(app)
            .post("/identify")
            .send({ email: "alpha@test.com", phoneNumber: "222" });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            contact: {
                primaryContactId: 1,
                emails: ["alpha@test.com", "beta@test.com"],
                phoneNumbers: ["111", "222"],
                secondaryContactIds: [2],
            },
        });
        expect(prisma.contact.update).toHaveBeenCalledWith({
            where: { id: 2 },
            data: { linkedPrecedence: "secondary", linkedId: 1 },
        });
    });
    it("should consolidate an already secondary request under its true primary", async () => {
        prisma.contact.findMany.mockResolvedValue([
            {
                id: 1,
                email: "primary@test.com",
                phoneNumber: "555000",
                linkedPrecedence: "primary",
            },
            {
                id: 2,
                email: "secondary@test.com",
                phoneNumber: "555111",
                linkedPrecedence: "secondary",
                linkedId: 1,
            },
        ]);
        const response = await request(app)
            .post("/identify")
            .send({ email: "secondary@test.com" });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            contact: {
                primaryContactId: 1,
                emails: ["primary@test.com", "secondary@test.com"],
                phoneNumbers: ["555000", "555111"],
                secondaryContactIds: [2],
            },
        });
    });
    it("should skip soft-deleted contacts", async () => {
        prisma.contact.findMany.mockResolvedValue([
            {
                id: 1,
                email: "deleted@test.com",
                phoneNumber: "555000",
                linkedPrecedence: "primary",
                deletedAt: new Date(),
            },
        ]);
        const response = await request(app)
            .post("/identify")
            .send({ email: "deleted@test.com", phoneNumber: "555000" });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            contact: {
                primaryContactId: undefined,
                emails: [],
                phoneNumbers: [],
                secondaryContactIds: [],
            },
        });
    });
});
//# sourceMappingURL=identification_process.test.js.map