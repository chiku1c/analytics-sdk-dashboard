import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  Activity,
  Users,
  Eye,
  RefreshCw,
  CalendarDays,
  AlertCircle,
  Search,
} from "lucide-react";
import "./App.css";

const API_URL = "http://localhost:4000";

type EventBreakdown = {
  event_name: string;
  count: number;
};

type DailyTrend = {
  date: string;
  count: number;
};

type PopularPage = {
  page_url: string;
  views: number;
  unique_visitors: number;
};

type Summary = {
  from: string;
  to: string;
  total_events: number;
  unique_users: number;
  events_by_name: EventBreakdown[];
  daily_trends: DailyTrend[];
  popular_pages: PopularPage[];
};

type AnalyticsEvent = {
  id: number;
  event_name: string;
  user_id: string;
  event_properties: Record<string, unknown> | null;
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

type AnalyticsUser = {
  user_id: string;
  total_events: number;
  event_types: number;
  last_activity: string;
};

type UsersResponse = {
  users: AnalyticsUser[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

type Page = "overview" | "events" | "users";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function App() {
  const [activePage, setActivePage] = useState<Page>("overview");
  const [from, setFrom] = useState(getDaysAgo(6));
  const [to, setTo] = useState(getToday());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [eventsSearch, setEventsSearch] = useState("");
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsTotalPages, setEventsTotalPages] = useState(0);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");

  const [users, setUsers] = useState<AnalyticsUser[]>([]);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  async function loadAnalytics() {
    if (from > to) {
      setError("Start date, end date se pehle honi chahiye.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/analytics/summary?from=${from}&to=${to}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Analytics load nahi ho payi.");
      }

      setSummary(data as Summary);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "API se connection nahi ho paya."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents(page = eventsPage, search = eventsSearch) {
    setEventsLoading(true);
    setEventsError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        search,
      });
      const response = await fetch(`${API_URL}/api/events?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Events load nahi ho sake.");
      }

      const result = data as EventsResponse;
      setEvents(result.events);
      setEventsTotal(result.total);
      setEventsTotalPages(result.total_pages);
      setEventsPage(result.page);
    } catch (err) {
      setEventsError(
        err instanceof Error
          ? err.message
          : "Events API se connection nahi ho paya."
      );
    } finally {
      setEventsLoading(false);
    }
  }

  async function loadUsers(page = usersPage, search = usersSearch) {
    setUsersLoading(true);
    setUsersError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        search,
      });
      const response = await fetch(
        `${API_URL}/api/analytics/users?${params.toString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Users load nahi ho sake.");
      }

      const result = data as UsersResponse;
      setUsers(result.users);
      setUsersTotal(result.total);
      setUsersTotalPages(result.total_pages);
      setUsersPage(result.page);
    } catch (err) {
      setUsersError(
        err instanceof Error
          ? err.message
          : "Users API se connection nahi ho paya."
      );
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    void loadAnalytics();
  }, []);

  useEffect(() => {
    if (activePage === "events") void loadEvents(1, eventsSearch);
    if (activePage === "users") void loadUsers(1, usersSearch);
  }, [activePage]);

  const chartData = summary?.events_by_name ?? [];

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Activity size={23} />
          </div>
          <div>
            <strong>Pulse Analytics</strong>
            <span>EVENT PLATFORM</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <button
          className={`nav-item ${activePage === "overview" ? "active" : ""}`}
          onClick={() => setActivePage("overview")}
        >
          <Activity size={18} /> Overview
        </button>
        <button
          className={`nav-item ${activePage === "events" ? "active" : ""}`}
          onClick={() => setActivePage("events")}
        >
          <Eye size={18} /> Events
        </button>
        <button
          className={`nav-item ${activePage === "users" ? "active" : ""}`}
          onClick={() => setActivePage("users")}
        >
          <Users size={18} /> Users
        </button>

        <div className="sidebar-bottom">
          <span className="status-dot" />
          API dashboard
          <small>Local environment</small>
        </div>
      </aside>

      <main className="main-content">
        {activePage === "events" ? (
          <section className="events-page">
            <header className="topbar">
              <div>
                <div className="eyebrow">ANALYTICS / EVENTS</div>
                <h1>Events</h1>
                <p className="subtitle">Apne product ke saare tracked events dekho.</p>
              </div>
              <button
                className="refresh-button"
                onClick={() => void loadEvents(eventsPage, eventsSearch)}
                disabled={eventsLoading}
              >
                <RefreshCw size={16} className={eventsLoading ? "spin" : ""} />
                {eventsLoading ? "Loading..." : "Refresh"}
              </button>
            </header>

            <div className="events-toolbar">
              <div className="events-search">
                <Search size={18} />
                <input
                  value={eventsSearch}
                  placeholder="Search event name or user ID..."
                  onChange={(event) => setEventsSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void loadEvents(1, eventsSearch);
                  }}
                />
              </div>
              <button
                className="apply-button"
                onClick={() => void loadEvents(1, eventsSearch)}
                disabled={eventsLoading}
              >
                Search
              </button>
            </div>

            {eventsError && (
              <div className="error-banner">
                <AlertCircle size={18} />
                <span>{eventsError}</span>
                <button onClick={() => void loadEvents(eventsPage, eventsSearch)}>Retry</button>
              </div>
            )}

            <section className="panel events-panel">
              <div className="panel-heading">
                <div>
                  <h2>All events</h2>
                  <p>{eventsTotal} events found</p>
                </div>
                <span className="panel-tag">LIVE DATA</span>
              </div>

              <div className="events-table-wrap">
                <table className="events-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Event name</th>
                      <th>User ID</th>
                      <th>Properties</th>
                      <th>Page URL</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventsLoading ? (
                      <tr><td colSpan={6} className="table-message">Loading events...</td></tr>
                    ) : events.length === 0 ? (
                      <tr><td colSpan={6} className="table-message">No events found.</td></tr>
                    ) : (
                      events.map((item) => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td><span className="event-badge">{item.event_name}</span></td>
                          <td>{item.user_id}</td>
                          <td><code>{JSON.stringify(item.event_properties ?? {})}</code></td>
                          <td>{item.page_url || "—"}</td>
                          <td>{new Date(item.created_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="events-pagination">
                <span>{eventsTotal} total events · Page {eventsPage} of {Math.max(1, eventsTotalPages)}</span>
                <div>
                  <button className="apply-button" disabled={eventsLoading || eventsPage <= 1} onClick={() => void loadEvents(eventsPage - 1, eventsSearch)}>Previous</button>
                  <button className="apply-button" disabled={eventsLoading || eventsTotalPages === 0 || eventsPage >= eventsTotalPages} onClick={() => void loadEvents(eventsPage + 1, eventsSearch)}>Next</button>
                </div>
              </div>
            </section>
          </section>
        ) : activePage === "users" ? (
          <section className="users-page">
            <header className="topbar">
              <div>
                <div className="eyebrow">ANALYTICS / USERS</div>
                <h1>Users</h1>
                <p className="subtitle">User activity aur event engagement track karo.</p>
              </div>
              <button
                className="refresh-button"
                onClick={() => void loadUsers(usersPage, usersSearch)}
                disabled={usersLoading}
              >
                <RefreshCw size={16} className={usersLoading ? "spin" : ""} />
                {usersLoading ? "Loading..." : "Refresh"}
              </button>
            </header>

            <div className="events-toolbar">
              <div className="events-search">
                <Search size={18} />
                <input
                  value={usersSearch}
                  placeholder="Search user ID..."
                  onChange={(event) => setUsersSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void loadUsers(1, usersSearch);
                  }}
                />
              </div>
              <button className="apply-button" onClick={() => void loadUsers(1, usersSearch)} disabled={usersLoading}>Search</button>
            </div>

            {usersError && (
              <div className="error-banner">
                <AlertCircle size={18} />
                <span>{usersError}</span>
                <button onClick={() => void loadUsers(usersPage, usersSearch)}>Retry</button>
              </div>
            )}

            <section className="metrics-grid user-metrics">
              <article className="metric-card">
                <div className="metric-top">
                  <span>Total users</span>
                  <div className="metric-icon blue"><Users size={20} /></div>
                </div>
                <strong>{usersTotal.toLocaleString()}</strong>
                <p>Distinct user IDs</p>
              </article>
              <article className="metric-card">
                <div className="metric-top">
                  <span>Users on this page</span>
                  <div className="metric-icon purple"><Activity size={20} /></div>
                </div>
                <strong>{users.length.toLocaleString()}</strong>
                <p>Current results</p>
              </article>
              <article className="metric-card">
                <div className="metric-top">
                  <span>Page</span>
                  <div className="metric-icon green"><Eye size={20} /></div>
                </div>
                <strong>{usersPage} / {Math.max(1, usersTotalPages)}</strong>
                <p>User list pagination</p>
              </article>
            </section>

            <section className="panel events-panel">
              <div className="panel-heading">
                <div>
                  <h2>All users</h2>
                  <p>{usersTotal} unique users found</p>
                </div>
                <span className="panel-tag">USER ACTIVITY</span>
              </div>
            
<div className="events-table-wrap">
  <table className="events-table">
    <thead>
      <tr>
        <th>User ID</th>
        <th>Total events</th>
        <th>Event types</th>
        <th>Last activity</th>
      </tr>
    </thead>
    <tbody>
      {usersLoading ? (
        <tr>
          <td colSpan={4} className="table-message">
            Loading users...
          </td>
        </tr>
      ) : users.length === 0 ? (
        <tr>
          <td colSpan={4} className="table-message">
            No users found.
          </td>
        </tr>
      ) : (
        users.map((user) => (
          <tr key={user.user_id}>
            <td>
              <button
                type="button"
                className="user-link"
                onClick={() =>
                  window.alert(`Selected user: ${user.user_id}`)
                }
              >
                {user.user_id}
              </button>
            </td>
            <td>{user.total_events}</td>
            <td>{user.event_types}</td>
            <td>
              {new Date(user.last_activity).toLocaleString()}
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>

              <div className="events-pagination">
                <span>{usersTotal} users · Page {usersPage} of {Math.max(1, usersTotalPages)}</span>
                <div>
                  <button className="apply-button" disabled={usersLoading || usersPage <= 1} onClick={() => void loadUsers(usersPage - 1, usersSearch)}>Previous</button>
                  <button className="apply-button" disabled={usersLoading || usersTotalPages === 0 || usersPage >= usersTotalPages} onClick={() => void loadUsers(usersPage + 1, usersSearch)}>Next</button>
                </div>
              </div>
            </section>
          </section>
        ) : (
          <>
            <header className="topbar">
              <div>
                <div className="eyebrow">ANALYTICS / OVERVIEW</div>
                <h1>Overview</h1>
                <p className="subtitle">Apne product ke events aur user activity ko track karo.</p>
              </div>
              <button className="refresh-button" onClick={() => void loadAnalytics()} disabled={loading}>
                <RefreshCw size={16} className={loading ? "spin" : ""} />
                {loading ? "Loading..." : "Refresh"}
              </button>
            </header>

            <section className="filters">
              <div className="filter-heading"><CalendarDays size={18} /><span>Date range</span></div>
              <label>
                From
                <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
              </label>
              <label>
                To
                <input type="date" value={to} min={from} max={getToday()} onChange={(event) => setTo(event.target.value)} />
              </label>
              <button className="apply-button" onClick={() => void loadAnalytics()} disabled={loading}>Apply filters</button>
            </section>

            {error && (
              <div className="error-banner">
                <AlertCircle size={19} />
                <span>{error}</span>
                <button onClick={() => void loadAnalytics()}>Retry</button>
              </div>
            )}

            <section className="metrics-grid">
              <article className="metric-card">
                <div className="metric-top"><span>Total events</span><div className="metric-icon purple"><Activity size={20} /></div></div>
                <strong>{summary?.total_events.toLocaleString() ?? "—"}</strong>
                <p>Selected date range</p>
              </article>
              <article className="metric-card">
                <div className="metric-top"><span>Unique users</span><div className="metric-icon blue"><Users size={20} /></div></div>
                <strong>{summary?.unique_users.toLocaleString() ?? "—"}</strong>
                <p>Distinct user IDs</p>
              </article>
              <article className="metric-card">
                <div className="metric-top"><span>Event types</span><div className="metric-icon green"><Eye size={20} /></div></div>
                <strong>{chartData.length.toLocaleString()}</strong>
                <p>Different event names</p>
              </article>
            </section>

            <section className="charts-grid">
              <article className="panel chart-panel">
                <div className="panel-heading">
                  <div><h2>Events by type</h2><p>Event count ka comparison</p></div>
                  <span className="panel-tag">EVENTS</span>
                </div>
                <div className="chart-area">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f5" />
                        <XAxis dataKey="event_name" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="count" name="Events" fill="#6258e8" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-state"><Activity size={28} /><strong>No events found</strong><span>Selected date range mein events nahi hain.</span></div>
                  )}
                </div>
              </article>

              <article className="panel breakdown-panel">
                <div className="panel-heading">
                  <div><h2>Event breakdown</h2><p>Events ki detailed list</p></div>
                </div>
                {chartData.length > 0 ? (
                  <div className="event-list">
                    {chartData.map((item, index) => {
                      const totalCount = summary?.total_events ?? 0;
                      const percentage = totalCount ? Math.round((item.count / totalCount) * 100) : 0;
                      return (
                        <div className="event-row" key={item.event_name}>
                          <div className="event-row-top">
                            <div className="event-name">
                              <span className={`event-marker marker-${index % 4}`} />
                              <span>{item.event_name}</span>
                            </div>
                            <strong>{item.count.toLocaleString()}</strong>
                          </div>
                          <div className="progress-track"><div className={`progress-fill fill-${index % 4}`} style={{ width: `${percentage}%` }} /></div>
                          <div className="event-percentage">{percentage}% of events</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state compact"><span>Data available hone par breakdown yahan dikhega.</span></div>
                )}
              </article>
            </section>

            <section className="panel activity-panel">
              <div className="panel-heading">
                <div><h2>Activity snapshot</h2><p>Selected range ka event distribution</p></div>
              </div>
              <div className="activity-chart">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6258e8" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#6258e8" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f5" />
                      <XAxis dataKey="event_name" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" name="Events" stroke="#6258e8" fill="url(#eventGradient)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state"><span>No activity to display yet.</span></div>
                )}
              </div>
            </section>

            <section className="panel activity-panel">
              <div className="panel-heading">
                <div><h2>Daily event trends</h2><p>Selected date range mein roz kitne events aaye</p></div>
                <span className="panel-tag">DAILY ACTIVITY</span>
              </div>
              <div className="activity-chart">
                {(summary?.daily_trends?.length ?? 0) > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary?.daily_trends ?? []} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dailyEventGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6258e8" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#6258e8" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f5" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" name="Events" stroke="#6258e8" fill="url(#dailyEventGradient)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state"><span>Selected date range mein daily activity nahi mili.</span></div>
                )}
              </div>
            </section>

            <section className="panel events-panel popular-pages-panel">
              <div className="panel-heading">
                <div><h2>Popular pages</h2><p>Selected date range ke sabse zyada visited pages</p></div>
                <span className="panel-tag">TOP 10 PAGES</span>
              </div>
              <div className="events-table-wrap">
                <table className="events-table">
                  <thead>
                    <tr>
                      <th>Page URL</th>
                      <th>Views</th>
                      <th>Unique visitors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary?.popular_pages?.length ?? 0) === 0 ? (
                      <tr><td colSpan={3} className="table-message">Selected date range mein page-view data nahi mila.</td></tr>
                    ) : (
                      (summary?.popular_pages ?? []).map((page) => (
                        <tr key={page.page_url}>
                          <td className="popular-page-url">{page.page_url}</td>
                          <td>{page.views.toLocaleString()}</td>
                          <td>{page.unique_visitors.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <footer className="footer">
              <span><span className="status-dot" /> Analytics API</span>
              <span>{from} — {to}</span>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
