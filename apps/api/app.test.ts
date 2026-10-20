
import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Mock database so tests do not modify real data.
vi.mock("./src/db.js", () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

import { app } from "./src/app.js";
import { pool } from "./src/db.js";

describe("Analytics API", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns a healthy database status", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [{ result: 1 }],
    } as never);

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.database).toBe("connected");
  });

  it("rejects an invalid analytics date range", async () => {
    const response = await request(app).get(
      "/api/analytics/summary?from=invalid&to=2026-10-20",
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("valid from and to dates");
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("rejects checkout when the user ID is invalid", async () => {
    const response = await request(app)
      .post("/api/checkout")
      .send({
        user_id: "",
        items: [{ id: 1, quantity: 1 }],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("user_id");
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it("returns summary metrics, daily trends, and popular pages", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [{ total_events: 3, unique_users: 2 }],
      } as never)
      .mockResolvedValueOnce({
        rows: [{ event_name: "page_view", count: 3 }],
      } as never)
      .mockResolvedValueOnce({
        rows: [{ date: "2026-10-20", count: 3 }],
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            page_url: "http://localhost:5175/",
            views: 3,
            unique_visitors: 2,
          },
        ],
      } as never);

    const response = await request(app).get(
      "/api/analytics/summary?from=2026-10-20&to=2026-10-20",
    );

    expect(response.status).toBe(200);
    expect(response.body.total_events).toBe(3);
    expect(response.body.unique_users).toBe(2);
    expect(response.body.events_by_name).toHaveLength(1);
    expect(response.body.daily_trends).toHaveLength(1);
    expect(response.body.popular_pages).toHaveLength(1);
    expect(response.body.popular_pages[0].views).toBe(3);
    expect(pool.query).toHaveBeenCalledTimes(4);
  });
});
