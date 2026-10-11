# BusPass: Bus Pass Management

A very small full-stack project built for a 45-minute workshop. Users log in with a phone OTP, buy a weekly or monthly bus pass, view their passes, and cancel them.

## Features

- Register and log in with a one-time password (OTP) sent through the [Minimoth](https://minimoth.dev) API
- Buy a weekly or monthly pass for a route
- View your passes as tickets (active, expired or cancelled)
- Cancel an active pass
- Responsive layout that works on phones and desktops

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Python + Flask |
| Database | SQLite (created automatically) |
| OTP | Minimoth API, called from the backend only |

## Project structure

```
bus-pass-management/
├── .gitignore
├── README.md
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── .env.example
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js
        ├── styles.css
        └── pages/
            ├── Login.jsx
            ├── Passes.jsx
            └── BuyPass.jsx
```

## Prerequisites

- Python 3.9+
- Node.js 18+
- A Minimoth API key

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/bus-pass-management.git
cd bus-pass-management
```

### 2. Run the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Windows: copy .env.example .env
```

Open `backend/.env` and set your key:

```
MINIMOTH_API_KEY=your_minimoth_api_key_here
PORT=5001
```

Start the server:

```bash
python app.py
```

The API runs at http://localhost:5001.

### 3. Run the frontend

Open a second terminal:

```bash
cd frontend
npm install
cp .env.example .env            # Windows: copy .env.example .env
npm run dev
```

Open http://localhost:5173.

## Environment variables

| File | Variable | Purpose |
|---|---|---|
| `backend/.env` | `MINIMOTH_API_KEY` | Your Minimoth API key (never commit this file) |
| `backend/.env` | `PORT` | Backend port (default `5001`) |
| `frontend/.env` | `VITE_BACKEND_URL` | Backend address used by the Vite dev proxy |

Only the `.env.example` files are committed. Real `.env` files are listed in `.gitignore`.

## How login works

1. Enter your phone number. A 10-digit number is treated as India (`+91`); otherwise include the country code. New users also enter a name.
2. The backend asks Minimoth to send an OTP.
3. Enter the code. The backend verifies it with Minimoth, creates the user on first login, and returns a session token.
4. The frontend stores the token and sends it as `Authorization: Bearer <token>` on later requests.

## API reference

| Method | Endpoint | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/api/otp/send` | No | `{ phone, name? }` | Sends an OTP |
| POST | `/api/otp/verify` | No | `{ phone, code, name? }` | Verifies the OTP, registers new users, returns `token` |
| GET | `/api/passes` | Yes | | Lists your passes |
| POST | `/api/passes` | Yes | `{ route, plan }` | Buys a pass (`weekly` ₹250, `monthly` ₹800) |
| DELETE | `/api/passes/:id` | Yes | | Cancels one of your passes |

Errors are returned as `{ "error": "message" }` with a suitable HTTP status.

## Database

SQLite file `backend/buspass.db`, created on first run.

| Table | Columns |
|---|---|
| `users` | id, phone, name |
| `sessions` | token, user_id |
| `passes` | id, user_id, code, route, plan, price, start_date, end_date, cancelled |

## Deployment (optional)

GitHub Pages can't run the Flask backend, so deploy the whole app as one service (for example on Render):

1. Make Flask serve the built frontend (`frontend/dist`) and add `gunicorn` to `backend/requirements.txt`.
2. Create a **Web Service** from your GitHub repo.
3. Build command:
   ```
   pip install -r backend/requirements.txt && cd frontend && npm install && npm run build
   ```
4. Start command:
   ```
   cd backend && gunicorn app:app
   ```
5. Add `MINIMOTH_API_KEY` in the service's environment settings.

On free hosting the SQLite file is reset on each deploy, which is fine for a demo.

## Notes and limitations

- The Minimoth calls (`POST https://api.minimoth.dev/v1/otp/send` and `/verify`, with an `X-Api-Key` header) follow a public Minimoth client. If the official docs differ, edit the `minimoth()` function in `backend/app.py`.
- Log out only clears the token in the browser, and sessions do not expire.
- The route and plan lists are defined in both `backend/app.py` and `frontend/src/pages/BuyPass.jsx`.
- Built as a workshop demo, so there are no tests, rate limiting or payment integration.
