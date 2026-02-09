import { useEffect, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Clock, CheckCircle, ChefHat, DollarSign, LayoutGrid, List, Filter, XCircle } from 'lucide-react';
import clsx from 'clsx';

export default function OrderList() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [filters, setFilters] = useState({
        status: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchOrders();
    }, [filters]);

    const fetchOrders = async () => {
        try {
            setError(null);
            setLoading(true);

            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            console.log('Fetching orders with params:', params.toString());
            const response = await api.get(`/orders?${params.toString()}`);
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
            fetchOrders(); // Refresh to ensure backend validation didn't reject it
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update status');
            fetchOrders(); // Revert
        }
    };

    const getStatusActions = (currentStatus) => {
        const actions = [];
        switch (currentStatus) {
            case 'pending':
                actions.push({ value: 'preparing', label: 'Start Cooking', icon: ChefHat, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' });
                actions.push({ value: 'cancelled', label: 'Cancel', icon: XCircle, color: 'bg-red-100 text-red-700 hover:bg-red-200' });
                break;
            case 'preparing':
                actions.push({ value: 'served', label: 'Serve Order', icon: CheckCircle, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' });
                actions.push({ value: 'cancelled', label: 'Cancel', icon: XCircle, color: 'bg-red-100 text-red-700 hover:bg-red-200' });
                break;
            case 'served':
                actions.push({ value: 'paid', label: 'Mark Paid', icon: DollarSign, color: 'bg-green-100 text-green-700 hover:bg-green-200' });
                actions.push({ value: 'cancelled', label: 'Cancel', icon: XCircle, color: 'bg-red-100 text-red-700 hover:bg-red-200' });
                break;
            default:
                break;
        }
        return actions;
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
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-3xl font-bold text-gray-800">Order Management</h2>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={clsx("p-2 rounded-md transition", viewMode === 'grid' ? "bg-white shadow text-brand-blue" : "text-gray-500 hover:text-gray-700")}
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={clsx("p-2 rounded-md transition", viewMode === 'list' ? "bg-white shadow text-brand-blue" : "text-gray-500 hover:text-gray-700")}
                    >
                        <List size={20} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex items-center space-x-2 text-gray-500">
                    <Filter size={18} />
                    <span className="font-medium">Filter:</span>
                </div>

                <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="border-gray-200 rounded-lg text-sm focus:ring-brand-blue"
                >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="preparing">Cooking</option>
                    <option value="served">Served</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                </select>

                <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">From:</span>
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        className="border-gray-200 rounded-lg text-sm"
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">To:</span>
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        className="border-gray-200 rounded-lg text-sm"
                    />
                </div>

                <button
                    onClick={() => setFilters({ status: '', startDate: '', endDate: '' })}
                    className="text-sm text-red-500 hover:text-red-700 underline ml-auto"
                >
                    Clear Filters
                </button>
            </div>

            <div className={clsx("gap-6", viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "space-y-4")}>
                {orders.map((order) => {
                    const StatusIcon = getStatusIcon(order.status);
                    const availableActions = getStatusActions(order.status);

                    return (
                        <div key={order._id} className={clsx(
                            "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition",
                            viewMode === 'list' && "flex flex-col md:flex-row md:items-center p-4"
                        )}>

                            {/* Header / Info */}
                            <div className={clsx("p-5", viewMode === 'list' && "p-0 flex-1 md:flex md:items-center md:gap-8")}>
                                <div className={clsx("flex items-center justify-between mb-4", viewMode === 'list' && "mb-0 md:w-1/4")}>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-mono font-bold text-gray-600">#{order._id.slice(-6).toUpperCase()}</span>
                                        <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-bold uppercase flex items-center space-x-1", getStatusColor(order.status))}>
                                            <StatusIcon size={12} />
                                            <span>{order.status}</span>
                                        </span>
                                    </div>
                                    {viewMode === 'grid' && <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                </div>

                                <div className={clsx("mb-4", viewMode === 'list' && "mb-0 md:w-1/4")}>
                                    <div className="font-medium text-gray-800">{order.customerName}</div>
                                    <div className="text-sm text-gray-500">{order.customerTable ? `Table ${order.customerTable}` : 'Takeout'}</div>
                                    {viewMode === 'list' && <div className="text-xs text-gray-400 md:hidden">{new Date(order.createdAt).toLocaleString()}</div>}
                                </div>

                                {/* Items Summary */}
                                <div className={clsx("mb-4", viewMode === 'list' && "mb-0 md: flex-1")}>
                                    <div className="text-sm text-gray-600 line-clamp-2">
                                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">{order.items.length} items total</div>
                                </div>

                                {/* Total */}
                                <div className={clsx("flex justify-between items-center", viewMode === 'list' && "md:w-32 md:justify-end md:mr-8")}>
                                    <span className={clsx("font-bold text-lg text-brand-blue", viewMode === 'grid' && "block")}>
                                        {formatPrice(order.totalAmount)}
                                    </span>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            {(availableActions.length > 0 || viewMode === 'list') && (
                                <div className={clsx(
                                    "bg-gray-50 px-5 py-3 border-t border-gray-100 flex gap-2 overflow-x-auto",
                                    viewMode === 'list' && "bg-transparent p-0 border-0 md:w-auto"
                                )}>
                                    {availableActions.map((action) => (
                                        <button
                                            key={action.value}
                                            onClick={() => handleStatusChange(order._id, action.value)}
                                            className={clsx(
                                                "flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap",
                                                action.color
                                            )}
                                        >
                                            <action.icon size={14} />
                                            <span>{action.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                        </div>
                    );
                })}
            </div>

            {orders.length === 0 && (
                <div className="text-center p-12 bg-white rounded-xl border border-gray-200 text-gray-500">
                    No active orders found.
                </div>
            )}
        </div>
        </div >
    );
}
