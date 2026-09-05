# AEGIS backend (Rust / Axum)

Behaviour-compatible port of the FastAPI demo in `../backend/`. Copied from `origin/main` onto **josh-prototype** so the Python operator console stays the default.

- Bind: `0.0.0.0:10000`
- JSON: `/api/v1/*` and `/ws/telemetry` (same contracts as FastAPI)
- Demo login: `operator@aegis.local` / `aegis`

```bash
cargo run --release
```

Do not change the Vite proxy off **8010** unless you are A/B testing this binary. File-for-file map: `../RUST_BACKEND_MAP.md`.
