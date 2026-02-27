import {
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isValidUsername,
  validateRegistration,
  validateLogin,
} from './validators';

describe('Validators', () => {
  describe('Email validation', () => {
    test('should validate correct email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    test('should reject invalid email', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
    });
  });

  describe('Phone validation', () => {
    test('should validate correct phone number', () => {
      expect(isValidPhone('09123456789')).toBe(true);
    });

    test('should reject short phone number', () => {
      expect(isValidPhone('123')).toBe(false);
    });
  });

  describe('Password validation', () => {
    test('should validate strong password', () => {
      expect(isValidPassword('password123')).toBe(true);
    });

    test('should reject weak password', () => {
      expect(isValidPassword('pass')).toBe(false);
      expect(isValidPassword('')).toBe(false);
    });
  });

  describe('Username validation', () => {
    test('should validate correct username', () => {
      expect(isValidUsername('johndoe')).toBe(true);
    });

    test('should reject short username', () => {
      expect(isValidUsername('jo')).toBe(false);
    });

    test('should reject very long username', () => {
      const longUsername = 'a'.repeat(31);
      expect(isValidUsername(longUsername)).toBe(false);
    });
  });

  describe('Registration validation', () => {
    test('should validate correct registration data', () => {
      const data = {
        username: 'johndoe',
        email: 'john@example.com',
        password: 'password123',
        password_confirm: 'password123',
        first_name: 'John',
        last_name: 'Doe',
      };
      const result = validateRegistration(data);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    test('should reject mismatched passwords', () => {
      const data = {
        username: 'johndoe',
        email: 'john@example.com',
        password: 'password123',
        password_confirm: 'password456',
        first_name: 'John',
        last_name: 'Doe',
      };
      const result = validateRegistration(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.password_confirm).toBeDefined();
    });
  });

  describe('Login validation', () => {
    test('should validate correct login credentials', () => {
      const data = {
        username: 'johndoe',
        password: 'password123',
      };
      const result = validateLogin(data, 'username');
      expect(result.isValid).toBe(true);
    });

    test('should reject weak password in login', () => {
      const data = {
        username: 'johndoe',
        password: 'pass',
      };
      const result = validateLogin(data, 'username');
      expect(result.isValid).toBe(false);
    });
  });
});
