import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { UserPlus, Trash2, Users, X } from 'lucide-react';

export default function AdminManagement() {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [creating, setCreating] = useState(false);

    const { registerAdmin, user } = useAuth(); // Assuming 'user' object has current user info (optional, for safety)

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            const { data } = await api.get('/admins');
            setAdmins(data);
        } catch (error) {
            toast.error('Failed to load admins');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this admin?')) return;
        try {
            await api.delete(`/admins/${id}`);
            toast.success('Admin deleted');
            setAdmins(admins.filter(a => a._id !== id));
        } catch (error) {
            toast.error('Failed to delete admin');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setCreating(true);

        const result = await registerAdmin(email, password);

        if (result.success) {
            toast.success('New Admin Account Created!');
            setEmail('');
            setPassword('');
            setShowForm(false);
            fetchAdmins(); // Refresh list
        } else {
            toast.error(result.error);
        }
        setCreating(false);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading admins...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800">Admin Users</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-brand-blue text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-600 transition"
                >
                    <UserPlus size={20} />
                    <span>Add New Admin</span>
                </button>
            </div>

            {/* List of Admins */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="p-4 text-gray-600 font-medium">Email</th>
                            <th className="p-4 text-gray-600 font-medium">ID</th>
                            <th className="p-4 text-right text-gray-600 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {admins.map((admin) => (
                            <tr key={admin._id} className="hover:bg-gray-50">
                                <td className="p-4 flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-brand-blue flex items-center justify-center">
                                        <Users size={16} />
                                    </div>
                                    <span className="font-medium text-gray-800">{admin.email}</span>
                                    {/* Optional: Label current user */}
                                </td>
                                <td className="p-4 text-gray-400 text-sm font-mono">{admin._id}</td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => handleDelete(admin._id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                        title="Delete Admin"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {admins.length === 0 && (
                    <div className="p-8 text-center text-gray-500">No admins found (Wait, how are you logged in?)</div>
                )}
            </div>

            {/* Add Admin Modal/Popup */}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-fade-in">
                        <button
                            onClick={() => setShowForm(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={24} />
                        </button>

                        <h3 className="text-xl font-bold text-gray-800 mb-6">Create New Admin</h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
                                    placeholder="new@admin.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
                                    placeholder="Secret password"
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="w-full bg-brand-blue text-white py-2 rounded-lg font-bold hover:bg-blue-600 transition"
                                >
                                    {creating ? 'Creating...' : 'Create Admin'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
