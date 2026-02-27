import { render, screen } from '@testing-library/react';
import App from './App';
import { Provider } from 'react-redux';
import store from './store/store';

describe('App Navigation', () => {
  test('renders navigation bar', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    expect(screen.getByText('Police System')).toBeInTheDocument();
  });

  test('shows public links when not authenticated', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });
});

describe('Home Page', () => {
  test('renders home page with statistics', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    expect(screen.getByText('Police Department Management')).toBeInTheDocument();
  });
});

describe('Most Wanted List', () => {
  test('renders most wanted page as public route', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    // Test that most wanted link is accessible
    const links = screen.getAllByText('Most Wanted');
    expect(links.length).toBeGreaterThan(0);
  });
});

describe('Authentication', () => {
  test('login page accessible without authentication', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  test('register page accessible without authentication', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    expect(screen.getByText('Register')).toBeInTheDocument();
  });
});
