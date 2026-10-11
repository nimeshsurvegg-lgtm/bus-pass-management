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
    <section className="card narrow">
      <h1>Ride more, queue less.</h1>
      <p className="muted">Log in with your phone number. We send you a one-time code.</p>

      {step === "phone" ? (
        <form onSubmit={sendOtp}>
          <label>
            Phone number
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" inputMode="tel" required />
          </label>
          <label>
            Name <span className="muted">(only needed the first time)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Asha Rao" />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary" disabled={loading}>{loading ? "Sending..." : "Send code"}</button>
        </form>
      ) : (
        <form onSubmit={verifyOtp}>
          <label>
            Code sent to {phone}
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" inputMode="numeric" maxLength={8} autoFocus required />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary" disabled={loading}>{loading ? "Checking..." : "Log in"}</button>
          <button type="button" className="link" onClick={() => { setStep("phone"); setCode(""); setError(""); }}>
            Use a different number
          </button>
        </form>
      )}
    </section>
  );
}
