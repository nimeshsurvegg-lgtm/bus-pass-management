import { useEffect, useState } from "react";
import { api } from "../api";

const fmt = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function Passes({ onUnauth, go }) {
  const [passes, setPasses] = useState(null);
  const [error, setError] = useState("");

  function fail(err) {
    if (err.status === 401) onUnauth();
    else setError(err.message);
  }

  useEffect(() => {
    api("/passes").then((data) => setPasses(data.passes)).catch(fail);
  }, []);

  async function cancel(id) {
    if (!window.confirm("Cancel this pass? This cannot be undone.")) return;
    try {
      const data = await api(`/passes/${id}`, { method: "DELETE" });
      setPasses(passes.map((p) => (p.id === id ? data.pass : p)));
    } catch (err) {
      fail(err);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!passes) return <p className="muted">Loading your passes...</p>;

  return (
    <section>
      <h1>My passes</h1>
      {passes.length === 0 && (
        <div className="card">
          <p>You have no passes yet.</p>
          <button className="primary" onClick={() => go("buy")}>Get your first pass</button>
        </div>
      )}
      {passes.map((p) => (
        <article className={`ticket ${p.status}`} key={p.id}>
          <div className="ticket-main">
            <h2>{p.route}</h2>
            <p>{p.plan === "weekly" ? "Weekly" : "Monthly"} pass, ₹{p.price}</p>
            <p className="muted">{fmt(p.start_date)} to {fmt(p.end_date)}</p>
          </div>
          <div className="ticket-stub">
            <span className="code">{p.code}</span>
            <span className={`status ${p.status}`}>{p.status}</span>
            {p.status === "active" && (
              <button className="link" onClick={() => cancel(p.id)}>Cancel</button>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
