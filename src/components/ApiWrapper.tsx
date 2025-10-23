export async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  // 👇 handle expired/invalid credentialing
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login"; // auto sign out
    throw new Error("Unauthorized - credentialing expired");
  }

  let result: any = {};
  try {
    result = await res.json();
  } catch {
    result = {};
  }

  return { res, result };
}