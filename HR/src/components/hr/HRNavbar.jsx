import { useNavigate } from "react-router-dom";
import { useHrAuth } from "../../context/HrAuthContext";
import { MessageCircle } from "lucide-react";

export default function HRNavbar() {
  const { employee, logout } = useHrAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="relative z-50 w-full px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4">
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3
        bg-white/70 backdrop-blur-xl
        border border-white/40
        shadow-lg
        rounded-2xl
        px-6 py-3"
      >
        {/* LEFT */}
        <div className="flex gap-2 ">

        <img
          src="/logo.jpeg"
          alt="logo"
          className="w-8 h-8 object-cover rounded-lg"
        />
        <h1 className="text-lg font-semibold text-gray-800 tracking-wide">
          HR Dashboard 
        </h1>
          </div>

        {/* RIGHT */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-center sm:justify-end">
          <button
            onClick={() => navigate("/chat")}
            className="p-2 hover:bg-gray-200 rounded"
          >
            <MessageCircle size={22} />
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-indigo-600 shrink-0 text-white rounded-lg hover:bg-indigo-700 shadow-lg"
          >
            Dashboard
          </button>
          {/* LOGOUT BUTTON */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium rounded-xl
            bg-gradient-to-r from-red-500 to-pink-500
            text-white shadow-md
            hover:scale-105 hover:shadow-lg
            transition"
          >
            Logout
          </button>
{/* USER INFO */}
          <div className="flex items-center gap-2 sm:gap-3 bg-white/60 px-3 sm:px-4 py-2 rounded-xl shadow-sm border border-white/40 w-full sm:w-auto justify-center sm:justify-start">
            {/* AVATAR */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold shadow">
              {employee?.name?.charAt(0)}
            </div>

            {/* TEXT */}
            <div className="leading-tight">
              <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate max-w-[120px] sm:max-w-none">
                {" "}
                {employee?.name}
              </p>
              <p className="text-xs text-gray-500">{employee?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
