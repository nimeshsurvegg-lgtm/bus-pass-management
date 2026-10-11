import { useState } from "react";
import { api, setToken } from "../api";

export default function Login({ onLogin }) {
  const [step, setStep] = useState("phone"); // "phone" -> "otp"
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/otp/send", { method: "POST", body: { phone, name } });
      setStep("otp");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("/otp/verify", { method: "POST", body: { phone, code, name } });
      setToken(data.token);
      onLogin();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <>
      <section className="hero">
        <h1>Ride more, queue less.</h1>
        <p>Weekly and monthly bus passes on your phone. No paper, no counter.</p>
        <div className="route"><i /><b /><i /><b /><i /></div>
      </section>

      <section className="card narrow">
        {step === "phone" ? (
          <form onSubmit={sendOtp} style={{ marginTop: 0 }}>
            <label>
              Phone number
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" inputMode="tel" required />
            </label>
            <label>
              Name <span className="muted">(first time only)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Asha Rao" />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="primary" disabled={loading}>{loading ? "Sending..." : "Send code"}</button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} style={{ marginTop: 0 }}>
            <label>
              Enter the code sent to {phone}
              <input className="otp" value={code} onChange={(e) => setCode(e.target.value)} placeholder="······" inputMode="numeric" maxLength={8} autoFocus required />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="primary" disabled={loading}>{loading ? "Checking..." : "Log in"}</button>
            <button type="button" className="link" onClick={() => { setStep("phone"); setCode(""); setError(""); }}>
              Use a different number
            </button>
          </form>
        )}
      </section>
    </>
  );
}
