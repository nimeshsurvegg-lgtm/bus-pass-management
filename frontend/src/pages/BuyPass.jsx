import { useState } from "react";
import { api } from "../api";

const ROUTES = [
  "Central Station to Tech Park",
  "Airport to City Centre",
  "University to Old Town",
  "Harbour to Market Square",
];
const PLANS = [
  { id: "weekly", label: "Weekly", detail: "Valid 7 days", price: 250 },
  { id: "monthly", label: "Monthly", detail: "Valid 30 days", price: 800 },
];

export default function BuyPass({ onUnauth, onDone }) {
  const [route, setRoute] = useState(ROUTES[0]);
  const [plan, setPlan] = useState("weekly");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const chosen = PLANS.find((p) => p.id === plan);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/passes", { method: "POST", body: { route, plan } });
      onDone();
    } catch (err) {
      if (err.status === 401) return onUnauth();
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <section className="card narrow">
      <h1>Get a pass</h1>
      <p className="muted">Pick your route and how long you need it.</p>
      <form onSubmit={submit}>
        <label>
          Route
          <select value={route} onChange={(e) => setRoute(e.target.value)}>
            {ROUTES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>

        <div className="plans">
          {PLANS.map((p) => (
            <label key={p.id} className={plan === p.id ? "plan on" : "plan"}>
              <input type="radio" name="plan" checked={plan === p.id} onChange={() => setPlan(p.id)} />
              <strong>{p.label}</strong>
              <span className="muted">{p.detail}</span>
              <span className="price">₹{p.price}</span>
            </label>
          ))}
        </div>

        <div className="summary">
          <span className="muted">Total</span>
          <span className="big">₹{chosen.price}</span>
        </div>

        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={loading}>{loading ? "Buying..." : `Buy ${chosen.label.toLowerCase()} pass`}</button>
      </form>
    </section>
  );
}
