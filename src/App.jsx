import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Footer, Header } from './components/Header';
import { PageLoader } from './components/UI';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Explore from './pages/Explore';
import ListingDetail from './pages/ListingDetail';
import PostListing from './pages/PostListing';
import { Login, Signup, Verify } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Saved from './pages/Saved';
import Inbox from './pages/Inbox';
import { HowItWorks, Pricing, Safety } from './pages/Info';
import CheckoutSuccess from './pages/CheckoutSuccess';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!user.verified) return <Navigate to={`/verify?next=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
}

function NotFound() {
  return <section className="not-found shell"><p className="overline">Page not found</p><h1>Looks like this room moved.</h1><p>There is plenty more to discover.</p><a className="button button--primary" href="/explore">Explore rooms</a></section>;
}

export default function App() {
  return <>
    <ScrollToTop />
    <a className="skip-link" href="#main-content">Skip to content</a>
    <Header />
    <main id="main-content">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/rooms/:id" element={<ListingDetail />} />
        <Route path="/post" element={<Protected><PostListing /></Protected>} />
        <Route path="/post/:id/edit" element={<Protected><PostListing /></Protected>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/saved" element={<Protected><Saved /></Protected>} />
        <Route path="/inbox" element={<Protected><Inbox /></Protected>} />
        <Route path="/inbox/:id" element={<Protected><Inbox /></Protected>} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/checkout/success" element={<Protected><CheckoutSuccess /></Protected>} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
    <Footer />
  </>;
}
