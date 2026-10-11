import { useState } from "react";
import { getToken, clearToken } from "./api";
import Login from "./pages/Login";
import Passes from "./pages/Passes";
import BuyPass from "./pages/BuyPass";

// 3 pages, switched with simple state (no router library needed)
export default function App() {
  const [page, setPage] = useState(getToken() ? "passes" : "login");

  function logout() {
    clearToken();
    setPage("login");
  }

  return (
    <>
      <header className="bar">
        <div className="brand">
          <span className="stop">B</span> BusPass
        </div>
        {page !== "login" && (
          <nav>
            <button className={page === "passes" ? "tab on" : "tab"} onClick={() => setPage("passes")}>
              My passes
            </button>
            <button className={page === "buy" ? "tab on" : "tab"} onClick={() => setPage("buy")}>
              Get a pass
            </button>
            <button className="tab" onClick={logout}>
              Log out
            </button>
          </nav>
        )}
      </header>

      <main>
        {page === "login" && <Login onLogin={() => setPage("passes")} />}
        {page === "passes" && <Passes onUnauth={logout} go={setPage} />}
        {page === "buy" && <BuyPass onUnauth={logout} onDone={() => setPage("passes")} />}
      </main>
    </>
  );
}
