import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../store/authSlice';

const Navigation = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const userRoles = (user?.roles || user?.groups || []).map((r) => String(r).toLowerCase());
  const showJudiciary = user?.is_staff || userRoles.includes('judge');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/');
  };

  return (
    <nav className="bg-blue-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold hover:text-blue-200">
            Police System
          </Link>

          {/* Navigation Links */}
          <div className="flex space-x-6 items-center">
            {!isAuthenticated ? (
              <>
                <Link to="/" className="hover:text-blue-200 transition">
                  Home
                </Link>
                <Link to="/login" className="hover:text-blue-200 transition">
                  Login
                </Link>
                <Link to="/register" className="hover:text-blue-200 transition">
                  Register
                </Link>
                <Link to="/most-wanted" className="hover:text-blue-200 transition">
                  Most Wanted
                </Link>
                <Link to="/bail" className="hover:text-blue-200 transition">
                  Bail
                </Link>
              </>
            ) : (
              <>
                <Link to="/dashboard" className="hover:text-blue-200 transition">
                  Dashboard
                </Link>
                <Link to="/cases" className="hover:text-blue-200 transition">
                  Cases
                </Link>
                <Link to="/complaints" className="hover:text-blue-200 transition">
                  Complaints
                </Link>
                <Link to="/suspects" className="hover:text-blue-200 transition">
                  Suspects
                </Link>
                <Link to="/tips" className="hover:text-blue-200 transition">
                  Tips
                </Link>
                <Link to="/most-wanted" className="hover:text-blue-200 transition">
                  Most Wanted
                </Link>
                <Link to="/bail" className="hover:text-blue-200 transition">
                  Bail
                </Link>
                {showJudiciary && (
                  <Link to="/judiciary" className="hover:text-blue-200 transition">
                    Judiciary
                  </Link>
                )}

                {/* User Menu */}
                <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-blue-700">
                  <span className="text-sm">
                    {user?.first_name || user?.username || 'User'}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm font-semibold transition"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
