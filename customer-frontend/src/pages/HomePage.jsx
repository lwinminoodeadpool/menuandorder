import { useState, useEffect } from 'react';
import api from '../lib/api';
import MenuCard from '../components/MenuCard';
import { Search } from 'lucide-react';

export default function HomePage() {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMenu();
    }, []);

    const fetchMenu = async () => {
        try {
            const { data } = await api.get('/menu');
            setItems(data);
            // Extract unique categories
            const cats = ['All', ...new Set(data.map(i => i.category))];
            setCategories(cats);
        } catch (error) {
            console.error('Failed to load menu', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter(item => {
        const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (loading) return (
        <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
    );

    return (
        <div>
            {/* Hero Section */}
            <section className="bg-gradient-to-r from-orange-400 to-red-500 text-white py-16 px-4">
                <div className="max-w-7xl mx-auto text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                        Hungry? Let's Eat!
                    </h1>
                    <p className="text-lg md:text-xl text-orange-100 max-w-2xl mx-auto">
                        Get fresh, hot meals delivered straight to your door or ready for pickup.
                    </p>

                    {/* Search Bar */}
                    <div className="mt-8 max-w-md mx-auto relative">
                        <input
                            type="text"
                            placeholder="Search for food..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-5 py-3 rounded-full text-gray-800 focus:ring-4 focus:ring-orange-300 outline-none shadow-lg pl-12"
                        />
                        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                    </div>
                </div>
            </section>

            {/* Menu & Categories */}
            <section className="max-w-7xl mx-auto px-4 py-8">

                {/* Category Tabs (Scrollable on mobile) */}
                <div className="flex space-x-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`whitespace-nowrap px-6 py-2 rounded-full font-medium transition-colors ${activeCategory === cat
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredItems.map(item => (
                        <MenuCard key={item._id} item={item} />
                    ))}
                </div>

                {filteredItems.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                        <p className="text-xl">No tasty items found matching your search.</p>
                    </div>
                )}

            </section>
        </div>
    );
}
