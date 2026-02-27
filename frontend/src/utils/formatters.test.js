import {
  formatRials,
  formatDate,
  formatStatus,
  truncateText,
  getInitials,
} from './formatters';

describe('Formatters', () => {
  test('should format Rials correctly', () => {
    const result = formatRials(1000000);
    expect(result).toBe('1,000,000');
  });

  test('should handle null Rials', () => {
    const result = formatRials(null);
    expect(result).toBe('0');
  });

  test('should format date correctly', () => {
    const result = formatDate('2024-01-15');
    expect(result).toContain('2024');
    expect(result).toContain('January');
    expect(result).toContain('15');
  });

  test('should handle invalid date', () => {
    const result = formatDate('invalid-date');
    expect(result).toBe('Invalid Date');
  });

  test('should format status to readable text', () => {
    const result = formatStatus('under_investigation');
    expect(result).toBe('UNDER INVESTIGATION');
  });

  test('should truncate long text', () => {
    const text = 'This is a very long text that should be truncated';
    const result = truncateText(text, 10);
    expect(result).toBe('This is a ...);
    expect(result.length).toBeLessThanOrEqual(13);
  });

  test('should not truncate short text', () => {
    const text = 'Short';
    const result = truncateText(text, 10);
    expect(result).toBe('Short');
  });

  test('should get initials correctly', () => {
    const result = getInitials('John', 'Doe');
    expect(result).toBe('JD');
  });

  test('should handle empty names', () => {
    const result = getInitials('', '');
    expect(result).toBe('');
  });
});
