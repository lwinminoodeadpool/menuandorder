import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Upload, ArrowLeft, Save } from 'lucide-react';
import axios from 'axios';

export default function MenuForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
    });
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [existingImage, setExistingImage] = useState(null);

    useEffect(() => {
        if (isEdit) {
            loadItem();
        }
    }, [id]);

    const loadItem = async () => {
        try {
            // We don't have a specific getOne endpoint in the summary, 
            // but usually apps have it or we filter from list.
            // Assuming generic list or generic cache. 
            // Wait, endpoint list had GET /menu but not GET /menu/:id specifically in requirements?
            // Requirement said: "PUT /menu/:id: (Protected) Edit menu details."
            // It didn't explicitly ask for GET /menu/:id.
            // However, usually we need it to prefill.
            // I will assume the list endpoint data is enough or I need to fetch all and find.
            // Let's try fetching all and filtering for now to be safe if specific endpoint missing,
            // OR just try GET /menu (it returns all).

            const { data } = await api.get('/menu');
            const item = data.find(i => i._id === id);
            if (item) {
                setFormData({
                    name: item.name,
                    description: item.description || '',
                    price: item.price,
                    category: item.category,
                });
                setExistingImage(item.imageUrl);
            }
        } catch (error) {
            toast.error('Failed to load item');
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEdit) {
                // Edit Mode (Updates Image only if needed - logic might need backend adjustment if file changed)
                // Current backend PUT /menu/:id just updates fields.
                // It doesn't handle new image upload in the same way as POST.
                // For simplicity in this iteration, we focus on uploading NEW items with images.
                // If editing, we just update text fields.
                await api.put(`/menu/${id}`, formData);
                toast.success('Item updated successfully');
            } else {
                // Create Mode
                if (!file) {
                    toast.error('Please select an image');
                    setLoading(false);
                    return;
                }

                // 1. Create Item + Get Presigned URL
                const createPayload = {
                    ...formData,
                    fileName: file.name,
                    fileType: file.type
                };

                const { data } = await api.post('/menu', createPayload);
                const { presignedUploadUrl } = data;

                // 2. Upload to S3
                await axios.put(presignedUploadUrl, file, {
                    headers: { 'Content-Type': file.type }
                });

                toast.success('Item created successfully');
            }
            navigate('/menu');
        } catch (error) {
            console.error(error);
            toast.error('Operation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center space-x-4 mb-8">
                <button onClick={() => navigate('/menu')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} className="text-gray-500" />
                </button>
                <h2 className="text-3xl font-bold text-gray-800">{isEdit ? 'Edit Item' : 'New Menu Item'}</h2>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Item Image</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition cursor-pointer relative">
                            <input
                                type="file"
                                onChange={handleFileChange}
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={isEdit} // Disable image update for edit mode initially to keep it simple as per backend constraint
                            />

                            {file ? (
                                <div className="text-green-600 font-medium flex flex-col items-center">
                                    <Upload size={32} className="mb-2" />
                                    {file.name}
                                </div>
                            ) : existingImage ? (
                                <div className="flex flex-col items-center">
                                    <img src={existingImage} className="w-32 h-32 object-cover rounded-lg mb-4" />
                                    <span className="text-gray-400 text-sm">(Editing image not supported)</span>
                                </div>
                            ) : (
                                <div className="text-gray-400 flex flex-col items-center">
                                    <Upload size={32} className="mb-2" />
                                    <span>Click to upload image</span>
                                    <span className="text-xs mt-1">PNG, JPG up to 5MB</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                            <input
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
                                placeholder="e.g. Chicken Burger"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Price (MMK)</label>
                            <input
                                name="price"
                                type="number"
                                required
                                value={formData.price}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
                                placeholder="5000"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select
                            name="category"
                            required
                            value={formData.category}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none bg-white"
                        >
                            <option value="">Select Category</option>
                            <option value="Main">Main Course</option>
                            <option value="Appetizer">Appetizer</option>
                            <option value="Dessert">Dessert</option>
                            <option value="Drinks">Drinks</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                            name="description"
                            rows="3"
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
                            placeholder="Brief description of the item..."
                        />
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-brand-green text-white px-8 py-3 rounded-lg font-bold hover:bg-green-600 transition shadow-lg flex items-center space-x-2 disabled:opacity-50"
                        >
                            <Save size={20} />
                            <span>{loading ? 'Saving...' : 'Save Item'}</span>
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
