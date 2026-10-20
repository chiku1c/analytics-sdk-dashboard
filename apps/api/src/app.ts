
import express, { type Request, type Response } from "express";
import cors from "cors";
import { pool } from "./db.js";
import {
    Activity,
    Users,
    Eye,
    RefreshCw,
    CalendarDays,
    AlertCircle,
    Search,
} from "lucide-react";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "100kb" }));

type EventInput = {
    event_name: string;
    user_id?: string | null;
    page_url?: string | null;
    properties?: Record<string, unknown>;
};

function isValidEvent(event: unknown): event is EventInput {
    if (
        !event ||
        typeof event !== "object" ||
        Array.isArray(event)
    ) {
        return false;
    }

    const item = event as Record<string, unknown>;

    return (
        typeof item.event_name === "string" &&
        item.event_name.trim().length > 0 &&
        item.event_name.length <= 100 &&
        (item.user_id === undefined ||
            item.user_id === null ||
            (typeof item.user_id === "string" &&
                item.user_id.length <= 100)) &&
        (item.page_url === undefined ||
            item.page_url === null ||
            typeof item.page_url === "string") &&
        (item.properties === undefined ||
            (item.properties !== null &&
                typeof item.properties === "object" &&
                !Array.isArray(item.properties)))
    );
}

function isValidDate(value: unknown): value is string {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

// Health check
app.get("/api/health", async (_req: Request, res: Response) => {
    try {
        await pool.query("SELECT 1");

        res.status(200).json({
            status: "ok",
            database: "connected",
        });
    } catch (error) {
        console.error("Database connection error:", error);

        res.status(503).json({
            status: "error",
            database: "disconnected",
        });
    }
});

// Shared event storage
async function storeEvents(events: EventInput[]) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        for (const item of events) {
            await client.query(
                `INSERT INTO events
          (event_name, user_id, event_properties, page_url)
         VALUES ($1, $2, $3::jsonb, $4)`,
                [
                    item.event_name.trim(),
                    item.user_id ?? null,
                    JSON.stringify(item.properties ?? {}),
                    item.page_url ?? null,
                ]
            );
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

// Client-side event ingestion
app.post("/api/events", async (req: Request, res: Response) => {
    const { events } = req.body ?? {};

    if (
        !Array.isArray(events) ||
        events.length === 0 ||
        events.length > 100
    ) {
        res.status(400).json({
            error: "events must be an array containing 1 to 100 items",
        });
        return;
    }

    if (!events.every(isValidEvent)) {
        res.status(400).json({
            error: "One or more events contain invalid fields",
        });
        return;
    }

    try {
        await storeEvents(events);

        res.status(201).json({
            success: true,
            received: events.length,
            message: "Events stored successfully",
        });
    } catch (error) {
        console.error("Event storage error:", error);

        res.status(500).json({
            error: "Failed to store events",
        });
    }
});

// Analytics summary

app.get(
    "/api/analytics/summary",
    async (req: Request, res: Response) => {
        const { from, to } = req.query;

        if (
            !isValidDate(from) ||
            !isValidDate(to) ||
            from > to
        ) {
            res.status(400).json({
                error: "Provide valid from and to dates in YYYY-MM-DD format",
            });
            return;
        }

        try {
            const dateFilter = `
        created_at >= $1::date
        AND created_at < ($2::date + INTERVAL '1 day')
      `;

            // Overall metrics
            const result = await pool.query(
                `SELECT
           COUNT(*)::int AS total_events,
           COUNT(DISTINCT user_id)::int AS unique_users
         FROM events
         WHERE ${dateFilter}`,
                [from, to]
            );

            // Event type breakdown
            const eventBreakdown = await pool.query(
                `SELECT event_name, COUNT(*)::int AS count
         FROM events
         WHERE ${dateFilter}
         GROUP BY event_name
         ORDER BY count DESC`,
                [from, to]
            );

            // Daily event trends
            const dailyTrends = await pool.query(
                `SELECT
           TO_CHAR(created_at::date, 'YYYY-MM-DD') AS date,
           COUNT(*)::int AS count
         FROM events
         WHERE ${dateFilter}
         GROUP BY created_at::date
         ORDER BY created_at::date ASC`,
                [from, to]
            );

            // Most visited pages (page views only)
            const popularPages = await pool.query(
                `SELECT
           page_url,
           COUNT(*)::int AS views,
           COUNT(DISTINCT user_id)::int AS unique_visitors
         FROM events
         WHERE ${dateFilter}
           AND event_name = 'page_view'
           AND page_url IS NOT NULL
           AND page_url <> ''
         GROUP BY page_url
         ORDER BY views DESC, page_url ASC
         LIMIT 10`,
                [from, to]
            );

            res.status(200).json({
                from,
                to,
                total_events: result.rows[0].total_events,
                unique_users: result.rows[0].unique_users,
                events_by_name: eventBreakdown.rows,
                daily_trends: dailyTrends.rows,
                popular_pages: popularPages.rows,
            });
        } catch (error) {
            console.error("Analytics summary error:", error);

            res.status(500).json({
                error: "Failed to fetch analytics summary",
            });
        }
    }
);


type AnalyticsEvent = {
    id: number;
    event_name: string;
    user_id: string;
    event_properties: Record<string, unknown>;
    page_url: string | null;
    created_at: string;
};

type EventsResponse = {
    events: AnalyticsEvent[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
};

// Server-side business events (API key protected)
app.post(
    "/api/server-events",
    async (req: Request, res: Response) => {
        const apiKey = process.env.SERVER_API_KEY;

        if (!apiKey) {
            res.status(500).json({
                error: "Server API key is not configured",
            });
            return;
        }

        if (req.header("x-api-key") !== apiKey) {
            res.status(401).json({
                error: "Invalid API key",
            });
            return;
        }

        const { events } = req.body ?? {};

        if (
            !Array.isArray(events) ||
            events.length === 0 ||
            events.length > 100
        ) {
            res.status(400).json({
                error: "events must be an array containing 1 to 100 items",
            });
            return;
        }

        if (!events.every(isValidEvent)) {
            res.status(400).json({
                error: "One or more events contain invalid fields",
            });
            return;
        }

        try {
            await storeEvents(events);

            res.status(201).json({
                success: true,
                received: events.length,
                message: "Server events stored successfully",
            });
        } catch (error) {
            console.error("Server event storage error:", error);

            res.status(500).json({
                error: "Failed to store server events",
            });
        }
    }
);


app.post("/api/checkout", async (req: Request, res: Response) => {
    const { user_id, items } = req.body ?? {};

    if (
        typeof user_id !== "string" ||
        !user_id.trim() ||
        user_id.length > 100
    ) {
        return res.status(400).json({
            error: "Valid user_id is required",
        });
    }

    if (!Array.isArray(items) || items.length === 0 || items.length > 6) {
        return res.status(400).json({
            error: "Cart items are invalid",
        });
    }

    const catalog: Record<number, { name: string; price: number }> = {
        1: { name: "Margherita Pizza", price: 299 },
        2: { name: "Classic Burger", price: 249 },
        3: { name: "Creamy Alfredo Pasta", price: 279 },
        4: { name: "Garden Fresh Salad", price: 179 },
        5: { name: "Chocolate Brownie", price: 149 },
        6: { name: "Classic Cheesecake", price: 169 },
    };

    const seen = new Set<number>();
    const orderItems: {
        id: number;
        name: string;
        price: number;
        quantity: number;
    }[] = [];

    for (const item of items) {
        if (
            !item ||
            !Number.isInteger(item.id) ||
            !Number.isInteger(item.quantity) ||
            item.quantity < 1 ||
            item.quantity > 20 ||
            !catalog[item.id] ||
            seen.has(item.id)
        ) {
            return res.status(400).json({
                error: "Invalid item ID or quantity",
            });
        }

        seen.add(item.id);
        orderItems.push({
            id: item.id,
            name: catalog[item.id].name,
            price: catalog[item.id].price,
            quantity: item.quantity,
        });
    }

    const itemCount = orderItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
    );

    const subtotal = orderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );

    let client;

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const orderResult = await client.query(
            `INSERT INTO orders
        (user_id, items, item_count, subtotal, status)
       VALUES ($1, $2::jsonb, $3, $4, 'created')
       RETURNING id, created_at`,
            [
                user_id.trim(),
                JSON.stringify(orderItems),
                itemCount,
                subtotal,
            ],
        );

        const order = orderResult.rows[0];

        await client.query(
            `INSERT INTO events
        (event_name, user_id, event_properties, page_url)
       VALUES ($1, $2, $3::jsonb, $4)`,
            [
                "order_created",
                user_id.trim(),
                JSON.stringify({
                    order_id: order.id,
                    item_count: itemCount,
                    subtotal,
                    currency: "INR",
                    app_name: "little-olive-restaurant",
                }),
                "http://localhost:5175/#cart",
            ],
        );

        await client.query("COMMIT");

        return res.status(201).json({
            success: true,
            order: {
                id: order.id,
                item_count: itemCount,
                subtotal: Number(subtotal.toFixed(2)),
                status: "created",
                created_at: order.created_at,
            },
        });
    } catch (error) {
        if (client) {
            await client.query("ROLLBACK").catch(() => { });
        }

        console.error("Checkout error:", error);

        return res.status(500).json({
            error: "Failed to create order",
        });
    } finally {
        client?.release();
    }
});


app.get("/api/events", async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(
            100,
            Math.max(1, Number(req.query.limit) || 10)
        );
        const search = String(req.query.search || "").trim();
        const offset = (page - 1) * limit;

        const result = await pool.query(
            `SELECT id, event_name, user_id, event_properties,
              page_url, created_at
       FROM events
       WHERE (
         $1 = ''
         OR event_name ILIKE '%' || $1 || '%'
         OR user_id ILIKE '%' || $1 || '%'
       )
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
            [search, limit, offset]
        );

        const countResult = await pool.query(
            `SELECT COUNT(*)::int AS total
       FROM events
       WHERE (
         $1 = ''
         OR event_name ILIKE '%' || $1 || '%'
         OR user_id ILIKE '%' || $1 || '%'
       )`,
            [search]
        );

        res.json({
            events: result.rows,
            total: countResult.rows[0].total,
            page,
            limit,
            total_pages: Math.ceil(countResult.rows[0].total / limit),
        });
    } catch (error) {
        next(error);
    }
});


app.post("/api/checkout", async (req, res) => {
    const { user_id, items } = req.body ?? {};

    if (
        typeof user_id !== "string" ||
        !user_id.trim() ||
        user_id.length > 100
    ) {
        return res.status(400).json({ error: "Valid user_id is required" });
    }

    if (
        !Array.isArray(items) ||
        items.length === 0 ||
        items.length > 6
    ) {
        return res.status(400).json({ error: "Cart items are invalid" });
    }

    const catalog: Record<number, { name: string; price: number }> = {
        1: { name: "Margherita Pizza", price: 299 },
        2: { name: "Classic Burger", price: 249 },
        3: { name: "Creamy Alfredo Pasta", price: 279 },
        4: { name: "Garden Fresh Salad", price: 179 },
        5: { name: "Chocolate Brownie", price: 149 },
        6: { name: "Classic Cheesecake", price: 169 },
    };

    const seen = new Set<number>();
    const orderItems: {
        id: number;
        name: string;
        price: number;
        quantity: number;
    }[] = [];

    for (const item of items) {
        if (
            !item ||
            !Number.isInteger(item.id) ||
            !Number.isInteger(item.quantity) ||
            item.quantity < 1 ||
            item.quantity > 20 ||
            !catalog[item.id] ||
            seen.has(item.id)
        ) {
            return res.status(400).json({
                error: "Invalid item ID or quantity",
            });
        }

        seen.add(item.id);
        orderItems.push({
            id: item.id,
            name: catalog[item.id].name,
            price: catalog[item.id].price,
            quantity: item.quantity,
        });
    }

    const itemCount = orderItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
    );

    const subtotal = orderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const orderResult = await client.query(
            `INSERT INTO orders
        (user_id, items, item_count, subtotal, status)
       VALUES ($1, $2::jsonb, $3, $4, 'created')
       RETURNING id, created_at`,
            [
                user_id.trim(),
                JSON.stringify(orderItems),
                itemCount,
                subtotal,
            ],
        );

        const order = orderResult.rows[0];

        await client.query(
            `INSERT INTO events
        (event_name, user_id, event_properties, page_url)
       VALUES ($1, $2, $3::jsonb, $4)`,
            [
                "order_created",
                user_id.trim(),
                JSON.stringify({
                    order_id: order.id,
                    item_count: itemCount,
                    subtotal,
                    currency: "INR",
                    app_name: "little-olive-restaurant",
                }),
                "http://localhost:5175/#cart",
            ],
        );

        await client.query("COMMIT");

        return res.status(201).json({
            success: true,
            order: {
                id: order.id,
                item_count: itemCount,
                subtotal,
                status: "created",
                created_at: order.created_at,
            },
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Checkout error:", error);

        return res.status(500).json({
            error: "Failed to create order",
        });
    } finally {
        client.release();
    }
});



app.get("/api/analytics/users", async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(
            100,
            Math.max(1, Number(req.query.limit) || 10)
        );
        const search = String(req.query.search || "").trim();
        const offset = (page - 1) * limit;

        const result = await pool.query(
            `SELECT
         user_id,
         COUNT(*)::int AS total_events,
         COUNT(DISTINCT event_name)::int AS event_types,
         MAX(created_at) AS last_activity
       FROM events
       WHERE user_id ILIKE '%' || $1 || '%'
       GROUP BY user_id
       ORDER BY MAX(created_at) DESC
       LIMIT $2 OFFSET $3`,
            [search, limit, offset]
        );

        const countResult = await pool.query(
            `SELECT COUNT(DISTINCT user_id)::int AS total
       FROM events
       WHERE user_id ILIKE '%' || $1 || '%'`,
            [search]
        );

        const total = countResult.rows[0].total;

        res.json({
            users: result.rows,
            total,
            page,
            limit,
            total_pages: Math.ceil(total / limit),
        });
    } catch (error) {
        next(error);
    }
});

// User activity details
app.get(
    "/api/analytics/users/:userId/events",
    async (req: Request, res: Response, next) => {
        try {
            const userId = req.params.userId;

            const result = await pool.query(
                `SELECT id, event_name, user_id, event_properties,
                page_url, created_at
         FROM events
         WHERE user_id = $1
         ORDER BY created_at DESC`,
                [userId]
            );

            res.json({
                user_id: userId,
                total_events: result.rows.length,
                events: result.rows,
            });
        } catch (error) {
            next(error);
        }
    }
);

// Unknown routes
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        error: "Route not found",
    });
});

// JSON parsing and other request errors
app.use(
    (
        error: Error & { status?: number },
        _req: Request,
        res: Response,
        _next: express.NextFunction
    ) => {
        console.error("API request error:", error);

        res.status(error.status ?? 500).json({
            error:
                error.status === 400
                    ? "Invalid JSON request body"
                    : "Internal server error",
        });
    }
);
