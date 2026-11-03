
import { useState } from 'react';
import './App.css';
import Dashboard from './Dashboard.jsx';

export default function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [authenticated, setAuthenticated] = useState(
  Boolean(localStorage.getItem('token'))
);

const [currentUser, setCurrentUser] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
  } catch {
    return null;
  }
});

  
async function handleSubmit(event) {
  event.preventDefault();
  setMessage('');

  const payload = isLogin
    ? { email: email.trim(), password }
    : {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      };

  try {
    const response = await fetch(
      `http://localhost:8080/api/auth/${isLogin ? 'login' : 'register'}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || data.error || `Request failed (${response.status})`
      );
    }

    if (isLogin) {
      const token = data.token ?? data.accessToken ?? data.jwt;

      if (!token) {
        throw new Error(
          'Login succeeded, but no JWT token was found in the response. Check the AuthResponse fields.'
        );
      }

      localStorage.setItem('token', token);
      localStorage.setItem(
        'currentUser',
        JSON.stringify({
          fullName: data.fullName ?? '',
          email: data.email ?? email.trim(),
          role: data.role ?? '',
        })
      );
const loggedInUser = {
  fullName: data.fullName ?? '',
  email: data.email ?? email.trim(),
  role: data.role ?? '',
};

setCurrentUser(loggedInUser);
setAuthenticated(true);
      setMessage('Login successful! Your authentication token is saved.');
    } else {
      setMessage('Registration successful! You can now sign in.');
      setIsLogin(true);
      setPassword('');
    }
  } catch (error) {
    setMessage(
      error.message || 'Unable to connect to the backend. Please try again.'
    );
  }
}


  function switchMode() {
    setIsLogin(!isLogin);
    setMessage('');
    setPassword('');
  }
if (authenticated) {
  return (
    <Dashboard
      user={currentUser}
      onLogout={() => {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        setAuthenticated(false);
        setCurrentUser(null);
        setIsLogin(true);
        setMessage('');
        setPassword('');
      }}
    />
  );
}
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="brand">
          <span className="brand-icon">₹</span>
          <span>FinTrack</span>
        </div>

        <div className="intro-content">
          <span className="eyebrow">YOUR MONEY, YOUR FUTURE</span>
          <h1>Make every rupee count.</h1>
          <p>
            Understand your spending, manage your budget, and build
            better financial habits in one place.
          </p>

          <div className="feature-list">
            <div><span>✓</span> Track income and expenses</div>
            <div><span>✓</span> Organize your financial life</div>
            <div><span>✓</span> Make smarter money decisions</div>
          </div>
        </div>

        <p className="intro-footer">Simple finances. Clearer decisions.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="mobile-brand">
            <span className="brand-icon">₹</span> FinTrack
          </div>

          <span className="eyebrow">
            {isLogin ? 'WELCOME BACK' : 'GET STARTED'}
          </span>

          <h2>{isLogin ? 'Sign in to FinTrack' : 'Create your account'}</h2>

          <p className="auth-description">
            {isLogin
              ? 'Enter your details to access your finances.'
              : 'Create an account to start managing your money.'}
          </p>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-field">
                <label htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {message && (
              <div className="form-message" role="status">
                {message}
              </div>
            )}

            <button className="submit-button" type="submit">
              {isLogin ? 'Sign in' : 'Create account'}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="switch-mode">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            {' '}
            <button type="button" onClick={switchMode}>
              {isLogin ? 'Create account' : 'Sign in'}
            </button>
          </p>

          <p className="security-note">
            Your financial journey starts here.
          </p>
        </div>
      </section>
    </main>
  );
}
