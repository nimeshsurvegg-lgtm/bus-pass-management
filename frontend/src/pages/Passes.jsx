import { useEffect, useState } from "react";
import { api } from "../api";

const fmt = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });

const daysLeft = (iso) => {
  const n = Math.ceil((new Date(iso + "T23:59:59") - new Date()) / 86400000);
  return n === 1 ? "1 day left" : `${n} days left`;
};

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
      <div className="page-head">
        <h1>My passes</h1>
        {passes.length > 0 && <button className="primary" onClick={() => go("buy")}>New pass</button>}
      </div>

      {passes.length === 0 && (
        <div className="card empty">
          <p>You have no passes yet.</p>
          <button className="primary" onClick={() => go("buy")}>Get your first pass</button>
        </div>
      )}

      {passes.map((p) => {
        const [from, to] = p.route.split(" to ");
        return (
          <article className={`ticket ${p.plan} ${p.status}`} key={p.id}>
            <div className="ticket-main">
              <div className="trip">
                <h2>{from}</h2>
                <div className="route"><i /><b /><i /></div>
                <h2>{to}</h2>
              </div>
              <div className="meta">
                <span>{p.plan === "weekly" ? "Weekly" : "Monthly"} pass, ₹{p.price}</span>
                <span>{fmt(p.start_date)} to {fmt(p.end_date)}</span>
              </div>
            </div>
            <div className="ticket-stub">
              <span className="code">{p.code}</span>
              <span className={`status ${p.status}`}>{p.status}</span>
              {p.status === "active" && <span className="left">{daysLeft(p.end_date)}</span>}
              <div className="barcode" />
              {p.status === "active" && (
                <button className="link" onClick={() => cancel(p.id)}>Cancel pass</button>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
