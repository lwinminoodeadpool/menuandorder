import { Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function MenuCard({ item }) {
    const { addToCart } = useCart();

    return (
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group flex flex-col h-full transform hover:-translate-y-2 border border-transparent hover:border-brand-orange/20">
            {/* Image */}
            <div className="relative h-48 overflow-hidden bg-gray-100">
                {item.imageUrl ? (
                    <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                        <span className="font-medium">No Image</span>
                    </div>
                )}
                <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold text-brand-orange shadow-sm border border-orange-100">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MMK' }).format(item.price)}
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-heading font-bold text-gray-800 text-xl group-hover:text-brand-orange transition-colors">
                        {item.name}
                    </h3>
                    <div className="flex flex-col items-end">
                        {!item.isAvailable && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">Unavailable</span>}
                        {item.stock === 0 && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-bold">Out of Stock</span>}
                    </div>
                </div>

                <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-grow leading-relaxed">
                    {item.description || 'Delicious food item prepared fresh for you.'}
                </p>

                {/* Add Button */}
                <button
                    onClick={() => addToCart(item)}
                    disabled={!item.isAvailable || item.stock === 0}
                    className={`w-full font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-300 shadow-md ${(!item.isAvailable || item.stock === 0)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-brand-orange text-white hover:bg-orange-600 active:scale-95 hover:shadow-orange-500/30'
                        }`}
                >
                    <Plus size={20} />
                    <span>{item.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</span>
                </button>
            </div>
        </div>
    );
}
