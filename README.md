# Phonebook

Full Stack Open exercise 21 phonebook application with a React/Vite frontend and a Node.js HTTP API. The backend uses Node's built-in modules, so it adds no production dependencies.

## Run locally

Install dependencies with `npm install`, then start the API with `npm run server` and the frontend with `npm run dev` in separate terminals. The API listens on port 3001, reads and writes `db.json`, and implements `GET`, `POST`, `PUT`, and `DELETE` at `/api/persons`. The Vite development server proxies `/api` requests to it.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/persons` | List all contacts |
| `GET` | `/api/persons/:id` | Get one contact |
| `POST` | `/api/persons` | Add a contact with a name and number |
| `PUT` | `/api/persons/:id` | Update a contact's name and number |
| `DELETE` | `/api/persons/:id` | Delete a contact |

Run `npm run build` to create the production frontend in `dist/`. `npm start` starts the backend, which serves both the API and the built frontend. Set `PORT` to change the listening port. `DATA_FILE` can point to a writable JSON database file; if that path does not exist yet, the server initializes it from `db.json`. `VITE_API_URL` can point the frontend to a separately hosted API origin; leave it unset when the frontend and backend share one host.

## CI/CD pipeline

`.github/workflows/pipeline.yml` runs on pull requests and pushes to `main`. It installs npm dependencies, runs ESLint, builds the frontend, and stores `dist/` as a workflow artifact. After a successful push to `main`, it triggers a Render deployment when the repository has the `RENDER_DEPLOY_HOOK` Actions secret configured.

For a single Render deployment, create a **Web Service** from this repository. Use `npm ci && npm run build` as the build command and `npm start` as the start command. Add the service's deploy hook URL as the repository Actions secret `RENDER_DEPLOY_HOOK`. To preserve phonebook changes across service replacements, attach a persistent disk mounted at `/var/data` and set `DATA_FILE=/var/data/db.json`. The first start seeds that file from `db.json`. Without a persistent disk, the database resets when the service instance is replaced.
