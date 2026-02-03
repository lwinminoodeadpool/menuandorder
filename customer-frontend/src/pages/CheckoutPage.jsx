import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { CreditCard, Truck, User } from 'lucide-react';

export default function CheckoutPage() {
    const { user } = useAuth();
    const { cart, totalPrice, clearCart } = useCart();
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        deliveryAddress: '',
    });

    const [submitting, setSubmitting] = useState(false);

    // Prefill if User
    useEffect(() => {
        if (user) {
            setFormData({
                customerName: user.name || '',
                customerPhone: user.phone || '',
                deliveryAddress: user.address || '',
            });
        }
    }, [user]);

    // Redirect if empty
    useEffect(() => {
        if (cart.length === 0) navigate('/cart');
    }, [cart, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                ...formData,
                userId: user?._id || undefined,
                items: cart.map(item => ({
                    menuId: item._id,
                    name: item.name,
                    quantity: item.quantity,
                    priceAtOrder: item.price
                })),
                totalAmount: totalPrice
            };

            await api.post('/orders', payload);

            clearCart();
            toast.success('Order Placed Successfully!');
            navigate('/');
        } catch (error) {
            toast.error('Failed to place order. Try again.');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Checkout</h1>

            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                {/* Identity Check */}
                {!user && (
                    <div className="mb-8 p-4 bg-orange-50 rounded-lg border border-orange-100 flex items-center justify-between">
                        <div className="flex items-center space-x-3 text-orange-800">
                            <User size={20} />
                            <span className="font-medium">Returning customer?</span>
                        </div>
                        <button onClick={() => navigate('/login')} className="text-orange-500 font-bold hover:underline">
                            Login to fill details
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Delivery Info */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold flex items-center space-x-2 text-gray-800">
                            <Truck className="text-orange-500" />
                            <span>Delivery Information</span>
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    required
                                    name="customerName"
                                    value={formData.customerName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input
                                    required
                                    name="customerPhone"
                                    value={formData.customerPhone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="09..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                            <textarea
                                required
                                rows="3"
                                name="deliveryAddress"
                                value={formData.deliveryAddress}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                placeholder="Street, Township, City..."
                            />
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Payment (Mock) */}
                    <div>
                        <h2 className="text-xl font-bold flex items-center space-x-2 text-gray-800 mb-4">
                            <CreditCard className="text-orange-500" />
                            <span>Payment Method</span>
                        </h2>
                        <div className="p-4 border-2 border-orange-500 bg-orange-50 rounded-lg flex items-center justify-between cursor-pointer">
                            <span className="font-bold text-gray-800">KBZPay / Cash on Delivery</span>
                            <div className="h-4 w-4 bg-brand-orange rounded-full"></div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            * You will pay when the food arrives or via KBZPay QR provided by rider.
                        </p>
                    </div>

                    {/* Total & Submit */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-gray-600 text-lg">Total to Pay</span>
                            <span className="text-3xl font-bold text-gray-900">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MMK' }).format(totalPrice)}
                            </span>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-brand-orange text-white py-4 rounded-xl font-bold text-xl hover:bg-orange-600 transition shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Processing...' : 'Place Order Now'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
