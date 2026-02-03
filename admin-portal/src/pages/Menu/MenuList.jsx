import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Plus, Edit, Trash2, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function MenuList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const { data } = await api.get('/menu');
            setItems(data);
        } catch (error) {
            toast.error('Failed to load menu items');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;

        try {
            await api.delete(`/menu/${id}`);
            toast.success('Item deleted successfully');
            setItems(items.filter(i => i._id !== id));
        } catch (error) {
            toast.error('Failed to delete item');
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-MM', { style: 'currency', currency: 'MMK' }).format(price);
    };



    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast.error("Excel file is empty");
                    return;
                }

                setLoading(true);
                await api.post('/menu/bulk', data);
                toast.success(`Successfully imported ${data.length} items!`);
                fetchItems();
            } catch (error) {
                console.error(error);
                toast.error("Failed to import menu items");
            } finally {
                setLoading(false);
                e.target.value = null; // Reset input
            }
        };
        reader.readAsBinaryString(file);
    };

    if (loading) return <div className="text-center p-10">Loading...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800">Menu Items</h2>
                <div className="flex space-x-3">


                    <label className="bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-600 transition cursor-pointer shadow-sm">
                        <Upload size={20} />
                        <span>Import Excel</span>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </label>

                    <Link to="/menu/new" className="bg-brand-green text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-600 transition">
                        <Plus size={20} />
                        <span>Add New Item</span>
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                        <tr>
                            <th className="p-4 w-20">Image</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Category</th>
                            <th className="p-4 text-right">Price</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {items.map((item) => (
                            <tr key={item._id} className="hover:bg-gray-50 transition">
                                <td className="p-4">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                                    ) : (
                                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">?</div>
                                    )}
                                </td>
                                <td className="p-4 font-medium text-gray-800">
                                    <div>{item.name}</div>
                                    <div className="text-xs text-gray-500">{item.description}</div>
                                </td>
                                <td className="p-4">
                                    <span className="px-3 py-1 bg-blue-50 text-brand-blue text-xs rounded-full font-medium">
                                        {item.category}
                                    </span>
                                </td>
                                <td className="p-4 text-right font-bold text-gray-700">{formatPrice(item.price)}</td>
                                <td className="p-4 flex justify-center space-x-2">
                                    <Link to={`/menu/edit/${item._id}`} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                                        <Edit size={18} />
                                    </Link>
                                    <button onClick={() => handleDelete(item._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-10 text-center text-gray-500">No menu items found. Add one to get started!</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
