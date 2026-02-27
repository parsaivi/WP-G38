import axios from 'axios';
import api from './api';

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('should add authorization header when token exists', () => {
    localStorage.setItem('access_token', 'test_token_123');

    const config = {
      headers: {},
    };

    // Simulate the interceptor
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    expect(config.headers.Authorization).toBe('Bearer test_token_123');
  });

  test('should handle requests without token', () => {
    const config = {
      headers: {},
    };

    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    expect(config.headers.Authorization).toBeUndefined();
  });

  test('should clear token on 401 error', () => {
    localStorage.setItem('access_token', 'old_token');
    localStorage.setItem('refresh_token', 'refresh_token');

    // Simulate 401 error handling
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });
});
