import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import MenuList from './pages/Menu/MenuList';
import MenuForm from './pages/Menu/MenuForm';
import OrderList from './pages/Orders/OrderList';
import AdminCreate from './pages/Admin/AdminCreate';
import { useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/menu" />} />

        {/* Menu Routes */}
        <Route path="menu" element={<MenuList />} />
        <Route path="menu/new" element={<MenuForm />} />
        <Route path="menu/edit/:id" element={<MenuForm />} />

        {/* Orders Routes */}
        <Route path="orders" element={<OrderList />} />

        {/* Admin Routes */}
        <Route path="admins" element={<AdminCreate />} />
      </Route>
    </Routes>
  );
}

export default App;
