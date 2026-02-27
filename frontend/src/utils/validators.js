// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (basic)
export const isValidPhone = (phone) => {
  const phoneRegex = /^[0-9]{10,}$/;
  return phoneRegex.test(phone.replace(/[-()\s]/g, ''));
};

// Password validation
export const isValidPassword = (password) => {
  return password && password.length >= 8;
};

// Username validation
export const isValidUsername = (username) => {
  return username && username.length >= 3 && username.length <= 30;
};

// National ID validation (Iranian)
export const isValidNationalId = (nationalId) => {
  return nationalId && nationalId.length >= 8;
};

// Validate form data
export const validateRegistration = (formData) => {
  const errors = {};

  if (!isValidUsername(formData.username)) {
    errors.username = 'Username must be between 3-30 characters';
  }

  if (!isValidEmail(formData.email)) {
    errors.email = 'Invalid email address';
  }

  if (!isValidPassword(formData.password)) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (formData.password !== formData.password_confirm) {
    errors.password_confirm = 'Passwords do not match';
  }

  if (!formData.first_name || formData.first_name.trim().length === 0) {
    errors.first_name = 'First name is required';
  }

  if (!formData.last_name || formData.last_name.trim().length === 0) {
    errors.last_name = 'Last name is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Validate login credentials
export const validateLogin = (credentials, method) => {
  const errors = {};

  if (method === 'email' && !isValidEmail(credentials.username)) {
    errors.username = 'Invalid email address';
  } else if (method === 'phone' && !isValidPhone(credentials.username)) {
    errors.username = 'Invalid phone number';
  } else if (!credentials.username || credentials.username.trim().length === 0) {
    errors.username = 'Username/Email/Phone/National ID is required';
  }

  if (!isValidPassword(credentials.password)) {
    errors.password = 'Password must be at least 8 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
