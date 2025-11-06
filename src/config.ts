export const API_BASE =
  import.meta.env.MODE === "production"
    ? "https://apivisits.paradigmops.com"
    : "http://localhost:8002";