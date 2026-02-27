import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../store/authSlice';

const LoginPage = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loginMethod, setLoginMethod] = useState('username'); // username, email, phone, national_id
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((state) => state.auth);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleMethodChange = (method) => {
    setLoginMethod(method);
    setCredentials({ username: '', password: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loginData = {
      identifier: credentials.username,
      password: credentials.password,
    };

    const result = await dispatch(loginUser(loginData));
    if (!result.error) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Police System
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Login Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Login Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['username', 'email', 'phone', 'national_id'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => handleMethodChange(method)}
                  className={`py-2 px-3 rounded text-sm font-semibold transition ${
                    loginMethod === method
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {method === 'username'
                    ? 'Username'
                    : method === 'national_id'
                    ? 'National ID'
                    : method.charAt(0).toUpperCase() + method.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Username/Email/Phone/National ID Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {loginMethod === 'username'
                ? 'Username'
                : loginMethod === 'email'
                ? 'Email'
                : loginMethod === 'phone'
                ? 'Phone'
                : 'National ID'}
            </label>
            <input
              type="text"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder={
                loginMethod === 'username'
                  ? 'Enter your username'
                  : loginMethod === 'email'
                  ? 'Enter your email'
                  : loginMethod === 'phone'
                  ? 'Enter your phone'
                  : 'Enter your national ID'
              }
              required
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Register Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
              Register here
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="mt-4 text-center">
          <Link to="/" className="text-gray-500 hover:text-gray-700 text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
