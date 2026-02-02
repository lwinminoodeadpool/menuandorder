import { createContext, useState, useContext, useEffect } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    // Load cart from local storage
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem('cart');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    // Save to local storage whenever cart changes
    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    // Add Item
    const addToCart = (item, quantity = 1) => {
        const existing = cart.find(i => i._id === item._id);
        if (existing) {
            toast.success(`Updated ${item.name} quantity`);
            setCart(prev => prev.map(i => i._id === item._id ? { ...i, quantity: i.quantity + quantity } : i));
        } else {
            toast.success(`Added ${item.name} to cart`);
            setCart(prev => [...prev, { ...item, quantity }]);
        }
    };

    // Remove Item
    const removeFromCart = (itemId) => {
        setCart(prev => prev.filter(i => i._id !== itemId));
    };

    // Update Quantity
    const updateQuantity = (itemId, delta) => {
        setCart(prev => prev.map(i => {
            if (i._id === itemId) {
                const newQty = Math.max(1, i.quantity + delta);
                return { ...i, quantity: newQty };
            }
            return i;
        }));
    };

    // Clear Cart
    const clearCart = () => {
        setCart([]);
    };

    // Totals
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }}>
            {children}
        </CartContext.Provider>
    );
};
