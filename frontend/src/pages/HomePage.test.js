import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import HomePage from './HomePage';
import store from '../store/store';
import * as statsService from '../services/statsService';

// Mock the stats service
jest.mock('../services/statsService');

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders home page title', () => {
    statsService.default.getDashboardStats.mockResolvedValue({
      data: {
        total_solved_cases: 10,
        total_staff: 5,
        active_cases: 3,
      },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      </Provider>
    );

    expect(screen.getByText('Police Department Management')).toBeInTheDocument();
  });

  test('displays statistics cards', async () => {
    statsService.default.getDashboardStats.mockResolvedValue({
      data: {
        total_solved_cases: 10,
        total_staff: 5,
        active_cases: 3,
      },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Solved Cases')).toBeInTheDocument();
      expect(screen.getByText('Total Staff')).toBeInTheDocument();
      expect(screen.getByText('Active Cases')).toBeInTheDocument();
    });
  });

  test('renders quick access links', () => {
    statsService.default.getDashboardStats.mockResolvedValue({
      data: {
        total_solved_cases: 10,
        total_staff: 5,
        active_cases: 3,
      },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      </Provider>
    );

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Cases')).toBeInTheDocument();
  });

  test('handles API error gracefully', async () => {
    statsService.default.getDashboardStats.mockRejectedValue({
      response: {
        data: {
          detail: 'API Error',
        },
      },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });
});
