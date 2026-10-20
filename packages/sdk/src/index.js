let config = null;
let currentUserId = null;
function getUserId() {
    if (currentUserId)
        return currentUserId;
    if (config?.userId) {
        currentUserId = config.userId;
        return currentUserId;
    }
    currentUserId =
        `anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    return currentUserId;
}
export function initAnalytics(options) {
    if (!options.apiUrl) {
        throw new Error("Analytics SDK requires an apiUrl.");
    }
    config = {
        ...options,
        apiUrl: options.apiUrl.replace(/\/+$/, ""),
    };
    currentUserId = options.userId ?? null;
    if (typeof window !== "undefined") {
        trackPageView();
        window.addEventListener("popstate", () => {
            trackPageView();
        });
    }
}
export function identify(userId) {
    if (!userId.trim()) {
        throw new Error("userId cannot be empty.");
    }
    currentUserId = userId;
}
export async function trackEvent(eventName, properties = {}) {
    if (!config) {
        throw new Error("Initialize the Analytics SDK first using initAnalytics().");
    }
    if (!eventName.trim()) {
        throw new Error("eventName cannot be empty.");
    }
    if (typeof window === "undefined")
        return;
    const event = {
        event_name: eventName,
        user_id: getUserId(),
        event_properties: {
            ...properties,
            ...(config.appName ? { app_name: config.appName } : {}),
        },
        page_url: window.location.href,
    };
    try {
        const response = await fetch(`${config.apiUrl}/api/events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ events: [event] }),
            keepalive: true,
        });
        if (!response.ok) {
            console.error(`Analytics event failed: HTTP ${response.status}`);
        }
    }
    catch (error) {
        console.error("Failed to send analytics event:", error);
    }
}
export function trackPageView() {
    if (typeof window === "undefined") {
        return Promise.resolve();
    }
    return trackEvent("page_view", {
        page: window.location.pathname,
        title: document.title,
    });
}
