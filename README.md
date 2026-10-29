# React + Vite

## Social network API

The React app uses the API in the sibling `backend` folder for accounts, posts, likes, comments, expiring stories, friend discovery and requests, profiles, and direct messages.

1. Start MongoDB locally or create a MongoDB Atlas database.
2. In `backend`, copy `.env.example` to `.env`, set `MONGODB_URI`, and set `JWT_SECRET` to a unique value of at least 32 characters. Run `npm install` and `npm run dev`.
3. In `frontend`, run `npm install` and `npm run dev`. The default API URL is `http://localhost:5000/api`; set `VITE_API_URL` in a local `.env` file if needed.

Create an account from the signup page. Passwords are hashed before storage and protected API routes require a signed-in account. Posts and stories support one uploaded photo or video each (up to 50 MB), stored by the backend in `backend/uploads`. Stories are shared with friends and expire after 24 hours. Conversations refresh every five seconds while open. For production, configure durable media storage and deployment infrastructure rather than relying on local disk. Post sharing and instant push-based message delivery are not included.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Deploy to Render

The `render.yaml` file configures this repository as a static site, including a rewrite so client-side routes such as `/login` and `/reset-password` load correctly. Connect the frontend repository to Render and create its Blueprint. Set `VITE_API_URL` to the deployed API URL followed by `/api`, for example `https://qavero-api.onrender.com/api`. Vite embeds this value at build time, so update it in the Render dashboard and redeploy whenever the API URL changes.

Deploy the backend first and use the exact frontend site URL for the backend's `CLIENT_ORIGIN`. Follow the backend README for MongoDB, SMTP, and persistent upload disk setup. Keep all production credentials in the Render dashboard, not in this repository.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
