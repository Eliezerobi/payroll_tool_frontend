import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../config";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      const data = new URLSearchParams();
      data.append("username", username.trim());
      data.append("password", password);

      const res = await fetch(`${API_BASE}/api/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: data.toString(),
      });

      if (!res.ok) {
        let message = "Invalid credentials";
        try {
          const result = (await res.json()) as { detail?: string };
          if (result?.detail) message = result.detail;
        } catch {
          // Keep default message when backend doesn't return JSON.
        }
        throw new Error(message);
      }

      const { access_token } = (await res.json()) as { access_token: string; token_type: string };
      localStorage.setItem("token", access_token);
      navigate("/home", { replace: true });
    } catch (e) {
      setError((e as Error).message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-2xl font-bold text-slate-900">Sign in</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          Enter your credentials to request an access token.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              id="username"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500"
              placeholder="Username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-slate-900 py-2.5 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}

        <p className="mt-6 text-center text-sm text-slate-600">
          Need an account?{" "}
          <Link to="/register" className="font-medium text-slate-900 hover:underline">
            Register with OTP
          </Link>
        </p>
      </div>
    </div>
  );
}
