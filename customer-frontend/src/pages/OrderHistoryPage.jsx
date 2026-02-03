
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, Package, ChevronRight } from 'lucide-react';

export default function OrderHistoryPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchOrders();
        }
    }, [user]);

    const fetchOrders = async () => {
        try {
            const { data } = await api.get('/orders/mine');
            setOrders(data);
        } catch (error) {
            console.error("Failed to fetch orders", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'preparing': return 'bg-blue-100 text-blue-800';
            case 'ready': return 'bg-purple-100 text-purple-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading your orders...</div>;

    if (orders.length === 0) {
        return (
            <div className="max-w-md mx-auto mt-12 p-8 text-center">
                <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500">
                    <Package size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">No orders yet</h2>
                <p className="text-gray-500 mb-8">Looks like you haven't placed any orders yet. Hungry?</p>
                <Link to="/" className="bg-brand-orange text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-200">
                    Order Now
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Orders</h1>

            <div className="space-y-4">
                {orders.map((order) => (
                    <Link
                        to={`/orders/${order._id}`}
                        key={order._id}
                        className="block bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-[0.99]"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                                    {order.status}
                                </span>
                                <div className="text-xs text-gray-400 mt-2">
                                    {new Date(order.createdAt).toLocaleDateString()} • {new Date(order.createdAt).toLocaleTimeString()}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-gray-900 text-lg">
                                    {(order.totalAmount).toLocaleString()} MMK
                                </div>
                                <div className="text-xs text-gray-500">{order.items.length} items</div>
                            </div>
                        </div>

                        <div className="border-t border-gray-50 pt-3 flex justify-between items-center">
                            <div className="text-sm text-gray-600 truncate max-w-[70%]">
                                {order.items.map(i => `${i.quantity}x ${i.name || 'Item'}`).join(', ')}
                            </div>
                            <ChevronRight size={18} className="text-gray-300" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
