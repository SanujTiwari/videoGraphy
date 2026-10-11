import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { BookingProvider } from './context/BookingContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { NotificationToast } from './components/NotificationToast';
import { MultiStepBookingModal } from './components/MultiStepBookingModal';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Services } from './pages/Services';
import { Packages } from './pages/Packages';
import { Portfolio } from './pages/Portfolio';
import { Contact } from './pages/Contact';
import { Track } from './pages/Track';
import { Login } from './pages/Login';
import { Portal } from './pages/Portal';
import { AdminDashboard } from './pages/AdminDashboard';
function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
}
function RequireRole({ roles, children }) {
    const { user, isLoading } = useAuth();
    if (isLoading)
        return <div className="py-32 text-center text-charcoal-500">Loading...</div>;
    if (!user)
        return <Navigate to="/login" replace/>;
    if (!roles.includes(user.role))
        return <Navigate to="/" replace/>;
    return children;
}
function Layout() {
    const { pathname } = useLocation();
    const isAdmin = pathname.startsWith('/admin');
    return (<div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />}/>
          <Route path="/about" element={<About />}/>
          <Route path="/services" element={<Services />}/>
          <Route path="/packages" element={<Packages />}/>
          <Route path="/portfolio" element={<Portfolio />}/>
          <Route path="/contact" element={<Contact />}/>
          <Route path="/track" element={<Track />}/>
          <Route path="/login" element={<Login />}/>
          <Route path="/portal" element={<RequireRole roles={['customer', 'owner', 'manager']}><Portal /></RequireRole>}/>
          <Route path="/admin/dashboard" element={<RequireRole roles={['owner', 'manager']}><AdminDashboard /></RequireRole>}/>
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </main>
      {!isAdmin && <Footer />}
      <NotificationToast />
      <MultiStepBookingModal />
    </div>);
}
export default function App() {
    return (<BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <BookingProvider>
            <ScrollToTop />
            <Layout />
          </BookingProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>);
}
