import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingBag, User, LogOut, Menu, Utensils } from 'lucide-react';

export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const { totalItems } = useCart();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
            {/* Navbar */}
            <nav className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        {/* Logo */}
                        <Link to="/" className="flex items-center space-x-2 text-orange-500 hover:opacity-90 transition">
                            <div className="bg-orange-500 text-white p-2 rounded-lg">
                                <Utensils size={24} />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-gray-900">Let's Eat</span>
                        </Link>

                        {/* Desktop Nav Actions */}
                        <div className="flex items-center space-x-6">
                            <Link to="/" className="text-gray-600 hover:text-orange-500 font-medium hidden sm:block">
                                Browse Menu
                            </Link>

                            {/* Cart Icon */}
                            <Link to="/cart" className="relative p-2 text-gray-600 hover:text-orange-500 transition group">
                                <ShoppingBag size={24} />
                                {totalItems > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                                        {totalItems}
                                    </span>
                                )}
                            </Link>

                            {/* User Menu */}
                            {user ? (
                                <div className="flex items-center space-x-4">
                                    <div className="hidden sm:flex flex-col items-end">
                                        <span className="text-sm font-semibold text-gray-800">{user.name}</span>
                                        <span className="text-xs text-gray-500">Customer</span>
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="p-2 text-gray-400 hover:text-red-500 transition"
                                        title="Sign Out"
                                    >
                                        <LogOut size={20} />
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    to="/login"
                                    className="bg-orange-500 text-white px-5 py-2 rounded-full font-bold shadow-md hover:bg-orange-600 hover:shadow-lg transition transform hover:-translate-y-0.5"
                                >
                                    Login
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-grow">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-gray-800 text-white py-12 mt-12">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="flex justify-center items-center space-x-2 mb-4 text-orange-500">
                        <Utensils size={32} />
                        <span className="text-2xl font-bold text-white">Let's Eat</span>
                    </div>
                    <p className="text-gray-400">Order delicious food online. Fresh, Fast, & Tasty.</p>
                    <div className="mt-8 text-sm text-gray-600 border-t border-gray-700 pt-8">
                        &copy; {new Date().getFullYear()} Let's Eat. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
