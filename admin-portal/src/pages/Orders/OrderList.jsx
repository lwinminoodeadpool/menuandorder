import { useEffect, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Clock, CheckCircle, ChefHat, DollarSign } from 'lucide-react';
import clsx from 'clsx';

export default function OrderList() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setError(null);
            console.log('Fetching orders...');
            const response = await api.get('/orders');
            console.log('Orders API Response:', response);

            const { data } = response;
            if (!Array.isArray(data)) {
                console.error('Data is not an array:', data);
                setError('Received invalid data format from server (check console)');
                setOrders([]);
                return;
            }

            setOrders(data);
        } catch (error) {
            console.error('Fetch orders error:', error);
            const msg = error.response?.data?.error || error.message || 'Failed to load orders';
            setError(msg);
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            // Optimistic update
            const originalOrders = [...orders];
            setOrders(orders.map(o => o._id === id ? { ...o, status: newStatus } : o));

            await api.put(`/orders/${id}`, { status: newStatus });
            toast.success(`Order marked as ${newStatus}`);
        } catch (error) {
            toast.error('Failed to update status');
            fetchOrders(); // Revert
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-MM', { style: 'currency', currency: 'MMK' }).format(price);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'preparing': return 'bg-blue-100 text-blue-800';
            case 'served': return 'bg-purple-100 text-purple-800';
            case 'paid': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return Clock;
            case 'preparing': return ChefHat;
            case 'served': return CheckCircle;
            case 'paid': return DollarSign;
            default: return Clock;
        }
    };

    if (loading) return <div className="text-center p-10">Loading orders...</div>;
    if (error) return <div className="text-center p-10 text-red-600 bg-red-50 rounded-lg m-4 border border-red-200">
        <p className="font-bold">Error loading orders:</p>
        <p>{error}</p>
        <button onClick={fetchOrders} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Retry</button>
    </div>;

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Order Management</h2>

            <div className="space-y-4">
                {orders.map((order) => {
                    const StatusIcon = getStatusIcon(order.status);
                    return (
                        <div key={order._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">

                            <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                    <span className="font-bold text-lg text-gray-800">#{order._id.slice(-6).toUpperCase()}</span>
                                    <span className={clsx("px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center space-x-1", getStatusColor(order.status))}>
                                        <StatusIcon size={14} />
                                        <span>{order.status}</span>
                                    </span>
                                    <span className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString()}</span>
                                </div>

                                <div className="text-gray-600 mb-1">
                                    <span className="font-medium">Customer:</span> {order.customerName} {order.customerTable && `(Table ${order.customerTable})`}
                                </div>

                                <div className="text-sm text-gray-500">
                                    {order.items.length} Items • <span className="font-bold text-brand-blue">{formatPrice(order.totalAmount)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center space-x-3 bg-gray-50 p-2 rounded-lg">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Set Status:</span>

                                {[
                                    { value: 'pending', label: 'Pending', icon: Clock, color: 'hover:bg-yellow-100 hover:text-yellow-700' },
                                    { value: 'preparing', label: 'Cooking', icon: ChefHat, color: 'hover:bg-blue-100 hover:text-blue-700' },
                                    { value: 'served', label: 'Served', icon: CheckCircle, color: 'hover:bg-purple-100 hover:text-purple-700' },
                                    { value: 'paid', label: 'Paid', icon: DollarSign, color: 'hover:bg-green-100 hover:text-green-700' }
                                ].map((btn) => (
                                    <button
                                        key={btn.value}
                                        onClick={() => handleStatusChange(order._id, btn.value)}
                                        className={clsx(
                                            "p-2 rounded-md transition-all",
                                            order.status === btn.value ? "bg-white shadow-sm ring-1 ring-gray-200" : "text-gray-400",
                                            btn.color
                                        )}
                                        title={btn.label}
                                    >
                                        <btn.icon size={20} />
                                    </button>
                                ))}
                            </div>

                        </div>
                    );
                })}

                {orders.length === 0 && (
                    <div className="text-center p-12 bg-white rounded-xl border border-gray-200 text-gray-500">
                        No active orders found.
                    </div>
                )}
            </div>
        </div>
    );
}
