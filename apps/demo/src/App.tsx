
import { useEffect, useState } from "react";
import {
    initAnalytics,
    trackEvent,
    identify,
} from "@analytics/sdk";

type MenuItem = {
    id: number;
    name: string;
    description: string;
    price: number;
    category: "Popular" | "Mains" | "Desserts";
    emoji: string;
};

const menu: MenuItem[] = [
    {
        id: 1,
        name: "Margherita Pizza",
        description: "Fresh mozzarella, basil and tomato sauce",
        price: 299,
        category: "Popular",
        emoji: "🍕",
    },
    {
        id: 2,
        name: "Classic Burger",
        description: "Grilled patty, lettuce and house sauce",
        price: 249,
        category: "Popular",
        emoji: "🍔",
    },
    {
        id: 3,
        name: "Creamy Alfredo Pasta",
        description: "Creamy parmesan sauce with herbs",
        price: 279,
        category: "Mains",
        emoji: "🍝",
    },
    {
        id: 4,
        name: "Garden Fresh Salad",
        description: "Seasonal greens, cucumber and citrus dressing",
        price: 179,
        category: "Mains",
        emoji: "🥗",
    },
    {
        id: 5,
        name: "Chocolate Brownie",
        description: "Warm chocolate brownie with a rich center",
        price: 149,
        category: "Desserts",
        emoji: "🍫",
    },
    {
        id: 6,
        name: "Classic Cheesecake",
        description: "Creamy cheesecake with a biscuit base",
        price: 169,
        category: "Desserts",
        emoji: "🍰",
    },
];

const categories = ["All", "Popular", "Mains", "Desserts"] as const;

type Category = (typeof categories)[number];

export default function App() {
    const [category, setCategory] = useState<Category>("All");
    const [cart, setCart] = useState<Record<number, number>>({});
    const [message, setMessage] = useState("");
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    useEffect(() => {
        try {
            let userId = sessionStorage.getItem("little-olive-user");

            if (!userId) {
                userId = `visitor_${crypto.randomUUID()}`;
                sessionStorage.setItem("little-olive-user", userId);
            }

            identify(userId);

            initAnalytics({
                apiUrl: "http://localhost:4000",
                appName: "little-olive-restaurant",
                userId,
            });

            void trackEvent("restaurant_demo_opened", {
                source: "restaurant_demo",
            });
        } catch (error) {
            console.error("Analytics initialization failed:", error);
        }
    }, []);

    const filteredMenu =
        category === "All"
            ? menu
            : menu.filter((item) => item.category === category);

    const cartCount = Object.values(cart).reduce(
        (total, quantity) => total + quantity,
        0,
    );

    const subtotal = menu.reduce(
        (total, item) => total + item.price * (cart[item.id] ?? 0),
        0,
    );

    function addToCart(item: MenuItem) {
        setCart((current) => ({
            ...current,
            [item.id]: (current[item.id] ?? 0) + 1,
        }));

        setMessage(`${item.name} added to your cart`);

        void trackEvent("add_to_cart", {
            item_id: item.id,
            item_name: item.name,
            price: item.price,
            quantity: 1,
        });
    }

    function changeQuantity(itemId: number, change: number) {
        setCart((current) => {
            const nextQuantity = (current[itemId] ?? 0) + change;
            const next = { ...current };

            if (nextQuantity <= 0) {
                delete next[itemId];
            } else {
                next[itemId] = nextQuantity;
            }

            return next;
        });
    }

    async function checkout() {
        if (cartCount === 0 || isCheckingOut) return;

        setIsCheckingOut(true);
        setMessage("");

        try {
            const userId = sessionStorage.getItem("little-olive-user");

            if (!userId) {
                throw new Error("User session not found. Refresh the page.");
            }

            const response = await fetch(
                "http://localhost:4000/api/checkout",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        items: Object.entries(cart)
                            .filter(([, quantity]) => quantity > 0)
                            .map(([id, quantity]) => ({
                                id: Number(id),
                                quantity,
                            })),
                    }),
                },
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Checkout failed");
            }

            setCart({});
            setMessage(
                `Order #${result.order.id} placed successfully! Total: ₹${result.order.subtotal}`,
            );

            void trackEvent("checkout_completed", {
                order_id: result.order.id,
                item_count: result.order.item_count,
                subtotal: result.order.subtotal,
            });
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Something went wrong during checkout.",
            );
        } finally {
            setIsCheckingOut(false);
        }
    }


    return (
        <div className="restaurant-app">
            <header className="topbar">
                <a className="brand" href="#" onClick={() => {
                    void trackEvent("brand_clicked");
                }}>
                    <span className="brand-mark">L</span>
                    <span>
                        <strong>little olive</strong>
                        <small>FRESH · SIMPLE · DELICIOUS</small>
                    </span>
                </a>

                <nav className="top-links">
                    <a href="#menu">Our menu</a>
                    <a href="#about">Our story</a>
                </nav>

                <a className="cart-pill" href="#cart">
                    🛍️ Your order <span>{cartCount}</span>
                </a>
            </header>

            <main>
                <section className="hero">
                    <div className="hero-copy">
                        <span className="eyebrow">GOOD FOOD, GOOD MOOD</span>
                        <h1>
                            A little joy
                            <br />
                            on <em>every plate.</em>
                        </h1>
                        <p>
                            Thoughtfully made favourites, fresh ingredients, and
                            delicious moments delivered to your table.
                        </p>
                        <a className="primary-button" href="#menu">
                            Explore the menu <span>→</span>
                        </a>
                        <div className="hero-note">
                            <span>✦</span> Made fresh when you order
                        </div>
                    </div>

                    <div className="hero-art" aria-label="Illustration of a delicious pizza">
                        <div className="hero-circle">
                            <span className="hero-spark spark-one">✳</span>
                            <span className="hero-spark spark-two">✦</span>
                            <div className="pizza-plate">
                                <div className="pizza">
                                    <span>🍕</span>
                                </div>
                            </div>
                            <div className="floating-label">
                                <span>♥</span>
                                Made with love
                            </div>
                        </div>
                    </div>
                </section>

                <section className="menu-section" id="menu">
                    <div className="section-heading">
                        <div>
                            <span className="eyebrow">THE GOOD STUFF</span>
                            <h2>Made for your cravings.</h2>
                            <p>A few of our favourites, just for you.</p>
                        </div>
                        <span className="menu-count">{menu.length} delicious choices</span>
                    </div>

                    <div className="category-tabs" aria-label="Menu categories">
                        {categories.map((item) => (
                            <button
                                className={category === item ? "category active" : "category"}
                                key={item}
                                onClick={() => {
                                    setCategory(item);
                                    void trackEvent("menu_category_selected", {
                                        category: item,
                                    });
                                }}
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    <div className="menu-grid">
                        {filteredMenu.map((item) => (
                            <article className="menu-card" key={item.id}>
                                <div className={`food-art food-${item.id}`}>
                                    <span>{item.emoji}</span>
                                    <span className="food-star">✳</span>
                                </div>

                                <div className="menu-card-content">
                                    <div className="item-heading">
                                        <h3>{item.name}</h3>
                                        <strong>₹{item.price}</strong>
                                    </div>
                                    <p>{item.description}</p>
                                    <div className="item-footer">
                                        <span className="item-category">{item.category}</span>

                                        <button
                                            className="add-button"
                                            onClick={() => addToCart(item)}
                                            aria-label={`Add ${item.name} to cart`}
                                        >
                                            {(cart[item.id] ?? 0) > 0
                                                ? `✓ Added · ${cart[item.id]}`
                                                : "+ Add"}
                                        </button>

                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="order-section" id="cart">
                    <div className="order-copy">
                        <span className="eyebrow">YOUR LITTLE FEAST</span>
                        <h2>Your order, your way.</h2>
                        <p>Review your picks before you continue.</p>
                    </div>

                    <div className="order-card">
                        {cartCount === 0 ? (
                            <div className="empty-cart">
                                <span>🛍️</span>
                                <h3>Your cart is waiting</h3>
                                <p>Add something delicious from our menu.</p>
                                <a href="#menu">Browse the menu →</a>
                            </div>
                        ) : (
                            <>
                                <div className="cart-items">
                                    {menu
                                        .filter((item) => (cart[item.id] ?? 0) > 0)
                                        .map((item) => (
                                            <div className="cart-item" key={item.id}>
                                                <span className="cart-emoji">{item.emoji}</span>
                                                <div className="cart-item-info">
                                                    <strong>{item.name}</strong>
                                                    <small>₹{item.price} each</small>
                                                </div>
                                                <div className="quantity-control">
                                                    <button
                                                        onClick={() => changeQuantity(item.id, -1)}
                                                        aria-label={`Remove one ${item.name}`}
                                                    >
                                                        −
                                                    </button>
                                                    <span>{cart[item.id]}</span>
                                                    <button
                                                        onClick={() => changeQuantity(item.id, 1)}
                                                        aria-label={`Add one ${item.name}`}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <strong className="line-total">
                                                    ₹{item.price * cart[item.id]}
                                                </strong>
                                            </div>
                                        ))}
                                </div>

                                <div className="subtotal-row">
                                    <span>Subtotal ({cartCount} items)</span>
                                    <strong>₹{subtotal}</strong>
                                </div>
                                <button
                                    className="checkout-button"
                                    disabled={isCheckingOut}
                                    onClick={() => void checkout()}
                                >
                                    {isCheckingOut ? "Please wait..." : "Continue to checkout →"}
                                </button>
                            </>
                        )}

                        {message && (
                            <p className="feedback-message" role="status">
                                {message}
                            </p>
                        )}
                    </div>
                </section>

                <section className="about-section" id="about">
                    <span className="about-icon">🌿</span>
                    <div>
                        <span className="eyebrow">A LITTLE ABOUT US</span>
                        <h2>Simple ingredients. Happier moments.</h2>
                        <p>
                            Little Olive is a sample restaurant experience built to
                            demonstrate page views, menu interactions and checkout
                            analytics.
                        </p>
                    </div>
                </section>
            </main>

            <footer className="footer">
                <a className="footer-brand" href="#">little olive</a>
                <span>Freshly made for your demo experience.</span>
                <span>© {new Date().getFullYear()} Little Olive</span>
            </footer>
        </div>
    );
}
