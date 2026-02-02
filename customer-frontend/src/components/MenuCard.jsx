import { Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function MenuCard({ item }) {
    const { addToCart } = useCart();

    return (
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden group flex flex-col h-full">
            {/* Image */}
            <div className="relative h-48 overflow-hidden bg-gray-100">
                {item.imageUrl ? (
                    <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <span>No Image</span>
                    </div>
                )}
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold text-gray-800 shadow-sm">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MMK' }).format(item.price)}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800 text-lg group-hover:text-orange-500 transition-colors">
                        {item.name}
                    </h3>
                </div>

                <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-grow">
                    {item.description || 'Delicious food item prepared fresh for you.'}
                </p>

                {/* Add Button */}
                <button
                    onClick={() => addToCart(item)}
                    className="w-full bg-orange-500 text-white hover:bg-orange-600 font-bold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 active:scale-95 shadow-md hover:shadow-lg"
                >
                    <Plus size={18} />
                    <span>Add to Cart</span>
                </button>
            </div>
        </div>
    );
}
