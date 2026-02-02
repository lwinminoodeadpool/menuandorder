import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
// Placeholder pages - will create next
import HomePage from './pages/HomePage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Simple placeholders to prevent crash before real pages are made
const Placeholder = ({ title }) => (
  <div className="max-w-7xl mx-auto px-4 py-12 text-center">
    <h1 className="text-4xl font-bold text-orange-500 mb-4">{title}</h1>
    <p className="text-gray-600">Coming Soon</p>
  </div>
);

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
