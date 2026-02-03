
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft, Check, Clock, ChefHat, Bike, MapPin } from 'lucide-react';

// Steps for the tracker
const STEPS = [
    { status: 'pending', label: 'Order Placed', icon: Clock },
    { status: 'preparing', label: 'Preparing', icon: ChefHat },
    { status: 'ready', label: 'Out for Delivery', icon: Bike },
    { status: 'completed', label: 'Delivered', icon: MapPin },
];

export default function OrderTrackerPage() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrder();
        // Poll for updates every 10 seconds
        const interval = setInterval(fetchOrder, 10000);
        return () => clearInterval(interval);
    }, [id]);

    const fetchOrder = async () => {
        try {
            // Reusing getMyOrders logic or we might need a specific getOneOrder endpoint.
            // Wait, I only implemented getMyOrders (list). 
            // I did NOT implement GET /orders/:id for customers yet in backend?
            // Let's check backend index.js ... 
            // BACKEND CHECK: The backend "GET /orders/mine" returns ALL orders.
            // Front-end can filter from that list or request specific if endpoint exists.
            // Currently backend DOES NOT have GET /orders/:id for customers explicitly protected by user ownership in a simple way 
            // aside from the admin one or the generic getMyOrders.
            // 
            // WORKAROUND: For now, I will use /orders/mine and find the specific order client-side to be safe 
            // and avoid backend changes if not needed. 
            // OR I can add GET /orders/:id to backend.
            // 
            // DECISION: To save a backend deploy cycle for the user, I will fetch ALL 'mine' orders and find this one.
            // It's not efficient for thousands of orders but fine for MVP.

            const { data } = await api.get('/orders/mine');
            const found = data.find(o => o._id === id);
            if (found) setOrder(found);
        } catch (error) {
            console.error("Failed to fetch order", error);
        } finally {
            setLoading(false);
        }
    };

    const getCurrentStepIndex = (status) => {
        const s = status?.toLowerCase();
        if (s === 'pending') return 0;
        if (s === 'preparing') return 1;
        if (s === 'ready') return 2; // "Ready" implies out for delivery contextually here
        if (s === 'completed') return 3;
        return 0;
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;
    if (!order) return <div className="p-10 text-center text-red-500">Order not found</div>;

    const currentStep = getCurrentStepIndex(order.status);

    return (
        <div className="max-w-xl mx-auto px-4 py-6">
            <div className="flex items-center space-x-4 mb-6">
                <Link to="/orders" className="p-2 hover:bg-gray-100 rounded-full transition">
                    <ArrowLeft size={24} className="text-gray-600" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Order #{order._id.slice(-6)}</h1>
            </div>

            {/* Tracker UI */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <div className="flex justify-between relative">
                    {/* Progress Bar Background */}
                    <div className="absolute top-5 left-0 w-full h-1 bg-gray-100 -z-0 rounded-full" />

                    {/* Active Progress */}
                    <div
                        className="absolute top-5 left-0 h-1 bg-brand-orange -z-0 transition-all duration-500 rounded-full"
                        style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                    />

                    {STEPS.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = index <= currentStep;
                        const isCurrent = index === currentStep;

                        return (
                            <div key={step.status} className="flex flex-col items-center relative z-10 w-1/4">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${isActive
                                        ? 'bg-brand-orange border-brand-orange text-white scale-110 shadow-lg shadow-orange-200'
                                        : 'bg-white border-gray-200 text-gray-300'
                                        }`}
                                >
                                    <Icon size={18} />
                                </div>
                                <div className={`text-[10px] uppercase font-bold mt-2 text-center transition-colors ${isActive ? 'text-brand-orange' : 'text-gray-300'
                                    }`}>
                                    {step.label}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 text-center p-4 bg-orange-50 rounded-xl">
                    <h3 className="text-orange-900 font-bold text-lg mb-1">
                        {currentStep === 3 ? 'Enjoy your food!' : 'Estimated Delivery'}
                    </h3>
                    <p className="text-orange-700 opacity-80 text-sm">
                        {currentStep === 3 ? 'Order Completed' : '30 - 45 Minutes'}
                    </p>
                </div>
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700">
                    Order Items
                </div>
                <div className="divide-y divide-gray-100">
                    {order.items.map((item, i) => (
                        <div key={i} className="p-4 flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <span className="bg-gray-100 text-gray-600 w-6 h-6 rounded flex items-center justify-center text-xs font-bold">
                                    {item.quantity}
                                </span>
                                <span className="text-gray-800">{item.name || 'Unknown Item'}</span>
                            </div>
                            <span className="text-gray-500 text-sm">
                                {(item.priceAtOrder * item.quantity).toLocaleString()}
                            </span>
                        </div>
                    ))}
                    <div className="p-4 flex justify-between items-center bg-gray-50 font-bold text-gray-900">
                        <span>Total</span>
                        <span>{order.totalAmount.toLocaleString()} MMK</span>
                    </div>
                </div>
            </div>

            <div className="text-center mt-8 text-xs text-gray-400">
                Order ID: {order._id} <br />
                Placed: {new Date(order.createdAt).toLocaleString()}
            </div>
        </div>
    );
}
