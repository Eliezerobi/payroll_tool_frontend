import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../config";

export default function Register() {
  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp: otp.trim(),
          username: username.trim(),
          password,
        }),
      });

      if (!res.ok) {
        let message = "Unable to create account";
        try {
          const result = (await res.json()) as { detail?: string };
          if (result?.detail) message = result.detail;
        } catch {
          // Keep fallback message if backend has no JSON.
        }
        throw new Error(message);
      }

      setSuccess("Account created. Redirecting to login...");
      setTimeout(() => navigate("/login", { replace: true }), 1000);
    } catch (e) {
      setError((e as Error).message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-2xl font-bold text-slate-900">Create account</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          Enter your one-time passcode, username, and password.
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="otp" className="mb-1 block text-sm font-medium text-slate-700">
              OTP
            </label>
            <input
              id="otp"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500"
              placeholder="One-time passcode"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          </div>

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
              required
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500"
              placeholder="Confirm password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-slate-900 py-2.5 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
        {success && <p className="mt-4 text-center text-sm text-emerald-700">{success}</p>}

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-slate-900 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
