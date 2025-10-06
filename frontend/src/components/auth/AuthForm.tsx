import React, { useState } from 'react';

interface AuthFormProps {
  readonly mode: 'login' | 'signup';
  readonly onSubmit: (data: { email: string; password: string; name?: string }) => void;
  readonly onSwitchMode: () => void;
  readonly onGoogleAuth: () => void;
  readonly onForgotPassword?: () => void;
  readonly loading?: boolean;
  readonly googleLoading?: boolean;
  readonly error?: string;
}

export default function AuthForm({ 
  mode, 
  onSubmit, 
  onSwitchMode, 
  onGoogleAuth, 
  onForgotPassword,
  loading = false,
  googleLoading = false,
  error 
}: AuthFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (mode === 'signup' && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'signup' && !formData.name.trim()) {
      errors.name = 'Name is required for signup';
    }

    if (mode === 'signup' && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div>
      {/* Global Error */}
      {error && (
        <div className="error-alert">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Name field for signup */}
        {mode === 'signup' && (
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`form-input ${formErrors.name ? 'error' : ''}`}
              placeholder="Enter your full name"
              disabled={loading}
            />
            {formErrors.name && (
              <div className="form-error">
                <span>⚠️</span>
                <span>{formErrors.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Email field */}
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`form-input ${formErrors.email ? 'error' : ''}`}
            placeholder="Enter your email"
            disabled={loading}
          />
          {formErrors.email && (
            <div className="form-error">
              <span>⚠️</span>
              <span>{formErrors.email}</span>
            </div>
          )}
        </div>

        {/* Password field */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label htmlFor="password" className="form-label">
              Password
            </label>
            {mode === 'login' && onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#5a67d8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#667eea';
                }}
              >
                Forgot password?
              </button>
            )}
          </div>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`form-input ${formErrors.password ? 'error' : ''}`}
            placeholder={mode === 'signup' ? 'Create a password (min 6 characters)' : 'Enter your password'}
            disabled={loading}
          />
          {formErrors.password && (
            <div className="form-error">
              <span>⚠️</span>
              <span>{formErrors.password}</span>
            </div>
          )}
        </div>

        {/* Confirm Password field for signup */}
        {mode === 'signup' && (
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`form-input ${formErrors.confirmPassword ? 'error' : ''}`}
              placeholder="Confirm your password"
              disabled={loading}
            />
            {formErrors.confirmPassword && (
              <div className="form-error">
                <span>⚠️</span>
                <span>{formErrors.confirmPassword}</span>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ marginBottom: '24px' }}
        >
          {loading ? (
            <>
              <div className="loading-spinner"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>{mode === 'login' ? '🔑' : '🚀'}</span>
              <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="divider">
          <div className="divider-text">Or continue with</div>
        </div>

        {/* Google Auth Button */}
        <button
          type="button"
          onClick={onGoogleAuth}
          disabled={loading || googleLoading}
          className="btn-google"
          style={{ marginBottom: '16px' }}
        >
          {googleLoading ? (
            <>
              <div className="loading-spinner google-spinner"></div>
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              <div className="google-icon">G</div>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Mode Switch */}
        <div className="switch-mode">
          <span>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            {' '}
            <button
              type="button"
              onClick={onSwitchMode}
              disabled={loading}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </span>
        </div>
      </form>
    </div>
  );
}