export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-4 text-center">Welcome Home</h1>
        <p className="text-gray-600 text-center">
          You’re logged in successfully! This is your home page.
        </p>
      </div>
    </div>
  );
}
