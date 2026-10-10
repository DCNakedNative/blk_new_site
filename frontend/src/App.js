import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import '@/App.css';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthContext } from './AuthContext';
import api from './lib/api';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Blog from './pages/Blog';
import BlogDetail from './pages/BlogDetail';
import Travel from './pages/Travel';
import TravelDetail from './pages/TravelDetail';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import AboutUs from './pages/AboutUs';
import Admin from './pages/Admin';
import SubmitEvent from './pages/SubmitEvent';
import Guidelines from './pages/Guidelines';
import NotFound from './pages/NotFound';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Scroll to the top when you open a new page.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Pages that need an account send you to sign in, then bring you back.
function RequireAuth({ children }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  if (!user) return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  return children;
}

// Signed-in people never see the login form; they go back to where they were headed.
function AuthRoute() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  if (user) return <Navigate to={location.state?.from || '/dashboard'} replace />;
  return <Auth />;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch((err) => {
        // Only sign people out when the server says the login is no longer valid.
        // A dropped connection or a server hiccup keeps their saved login.
        if (err.response?.status === 401) localStorage.removeItem('token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-brand-muted" role="status">Loading…</div>;

  return (
    <AuthContext.Provider value={value}>
      <div className="App">
        <div className="noise-overlay" aria-hidden="true"></div>
        <BrowserRouter>
          <a href="#main" className="skip-link">Skip to content</a>
          <ScrollToTop />
          <Navigation />
          <main id="main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:id" element={<BlogDetail />} />
              <Route path="/travel" element={<Travel />} />
              <Route path="/travel/:id" element={<TravelDetail />} />
              <Route path="/trips" element={<Travel />} />
              <Route path="/trips/:id" element={<TravelDetail />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/submit-event" element={<SubmitEvent />} />
              <Route path="/guidelines" element={<Guidelines />} />
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
              <Route path="/auth" element={<AuthRoute />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </BrowserRouter>
        <Toaster position="top-right" />
      </div>
    </AuthContext.Provider>
  );
}

export default App;
