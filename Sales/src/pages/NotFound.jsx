import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow border border-gray-100 p-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900">404</h1>
        <p className="text-gray-600 mt-2">
          Page not found. This route is not created yet.
        </p>

        <Link
          to="/sales-reports"
          className="btn-primary mt-6"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
