import request from "supertest";
import app from "./app.js";

describe("Create an account and using GET, validate account exists", () => {
    test("should respond with a 200 status code", async () => {
        await request(app).post("/create-user").send({
            email: "jaygala25@gmail.com",
            password: "123456",
            firstName: "Jay",
            lastName: "Gala"
        });

        const response = await request(app).get("/get-user").auth("jaygala25@gmail.com", "123456")
        expect(response.status).toBe(200);
    })
});

describe("Update the account and using GET, validate the account was updated", () => {
    test("should respond with a 200 status code", async () => {
        await request(app).put("/update-user").auth("jaygala25@gmail.com", "123456").send({
            firstName: "Akshay",
            lastName: "Dedhia",
            password: "123456"
        });

        const response = await request(app).get("/get-user").auth("jaygala25@gmail.com", "123456")
        expect(response.status).toBe(200);
        expect(response.body.first_name).toBe("Akshay");
        expect(response.body.last_name).toBe("Dedhia");
    })
})

afterAll((done) => {
    app.close(done);
})