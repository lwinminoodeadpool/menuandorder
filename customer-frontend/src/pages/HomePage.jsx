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
        <div className="flex justify-center items-center py-20 min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-orange"></div>
        </div>
    );

    return (
        <div>
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-brand-orange to-brand-red text-white py-20 px-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80')] opacity-10 bg-cover bg-center"></div>
                <div className="max-w-7xl mx-auto text-center space-y-6 relative z-10 animate-fade-in">
                    <h1 className="text-5xl md:text-7xl font-heading font-extrabold tracking-tight drop-shadow-md">
                        Hungry? <span className="text-brand-yellow">Let's Eat!</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-orange-50 max-w-2xl mx-auto font-light animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        Fresh, hot meals delivered straight to your door.
                    </p>

                    {/* Search Bar */}
                    <div className="mt-8 max-w-md mx-auto relative animate-slide-up" style={{ animationDelay: '0.4s' }}>
                        <input
                            type="text"
                            placeholder="Search for food..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-5 py-4 rounded-full text-gray-800 focus:ring-4 focus:ring-brand-orange/40 outline-none shadow-xl pl-12 glass transition-all focus:scale-105"
                        />
                        <Search className="absolute left-4 top-4 text-gray-500" size={24} />
                    </div>
                </div>
            </section>

            {/* Menu & Categories */}
            <section className="max-w-7xl mx-auto px-4 py-12">

                {/* Category Tabs */}
                <div className="flex space-x-3 overflow-x-auto pb-6 mb-8 scrollbar-hide snap-x">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`whitespace-nowrap px-6 py-2 rounded-full font-bold transition-all duration-300 transform hover:scale-105 snap-center ${activeCategory === cat
                                ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/30'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-brand-orange/50'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {filteredItems.map((item, index) => (
                        <div key={item._id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                            <MenuCard item={item} />
                        </div>
                    ))}
                </div>

                {filteredItems.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                        <p className="text-xl font-heading">No tasty items found matching your search.</p>
                    </div>
                )}

            </section>
        </div>
    );
}
