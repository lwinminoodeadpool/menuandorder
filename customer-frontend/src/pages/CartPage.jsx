import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';

export default function CartPage() {
    const { cart, removeFromCart, updateQuantity, totalPrice } = useCart();
    const navigate = useNavigate();

    if (cart.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Cart is Empty</h2>
                <p className="text-gray-500 mb-8">Looks like you haven't added any delicious food yet.</p>
                <Link to="/" className="inline-block bg-orange-500 text-white px-8 py-3 rounded-full font-bold hover:bg-orange-600 transition shadow-lg">
                    Start Ordering
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Your Order</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Cart Items List */}
                <div className="lg:col-span-2 space-y-4">
                    {cart.map(item => (
                        <div key={item._id} className="bg-white rounded-xl shadow-sm p-4 flex items-center border border-gray-100">
                            {/* Image */}
                            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Img</div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="ml-4 flex-grow">
                                <h3 className="font-bold text-gray-800">{item.name}</h3>
                                <p className="text-orange-500 font-medium">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MMK' }).format(item.price)}
                                </p>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => updateQuantity(item._id, -1)}
                                    disabled={item.quantity <= 1}
                                    className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="font-bold w-6 text-center">{item.quantity}</span>
                                <button
                                    onClick={() => updateQuantity(item._id, 1)}
                                    className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            {/* Remove */}
                            <button
                                onClick={() => removeFromCart(item._id)}
                                className="ml-6 text-gray-400 hover:text-red-500 transition"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Summary Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
                        <h2 className="text-xl font-bold text-gray-800 mb-6">Order Summary</h2>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MMK' }).format(totalPrice)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Delivery Fee</span>
                                <span className="text-green-600 font-medium">Free</span>
                            </div>
                            <div className="border-t pt-3 flex justify-between font-bold text-xl text-gray-900">
                                <span>Total</span>
                                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MMK' }).format(totalPrice)}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/checkout')}
                            className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition shadow-md flex items-center justify-center space-x-2"
                        >
                            <span>Proceed to Checkout</span>
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
