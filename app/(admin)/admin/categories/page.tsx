"use client";

import { useAdminStore } from "@/lib/admin-store";
import { Loader2, Plus, Edit2, Trash2, FolderTree, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { ImageUploader } from "@/components/admin/image-uploader";

// Minimal UUID generator for local temp ID
const generateId = () => Math.random().toString(36).substring(2, 9);

export default function CategoriesPage() {
  const { categories, isLoading, addCategory, updateCategory, deleteCategory } = useAdminStore();
  const [mounted, setMounted] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    sort_order: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const handleOpenModal = (category?: any) => {
    if (category) {
      setEditingId(category.id);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        image_url: category.image_url || "",
        sort_order: category.sort_order || 0,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        slug: "",
        description: "",
        image_url: "",
        sort_order: categories.length,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!editingId) {
      setFormData({ 
        ...formData, 
        name, 
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') 
      });
    } else {
      setFormData({ ...formData, name });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, formData);
        setToastMessage("Category saved successfully!");
      } else {
        await addCategory({
          id: generateId(),
          ...formData,
        } as any);
        setToastMessage("Category created successfully!");
      }
      setTimeout(() => setToastMessage(null), 3000);
      handleCloseModal();
    } catch (err) {
      console.error(err);
      alert("Failed to save category. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the category "${name}"?`)) {
      try {
        await deleteCategory(id);
        setToastMessage(`Category "${name}" deleted.`);
        setTimeout(() => setToastMessage(null), 3000);
      } catch (err) {
        console.error(err);
        alert("Failed to delete category.");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Save / Delete Toast Notification */}
      {toastMessage && (
        <div className="flex items-center gap-2.5 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-bold shadow-xs animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500">Manage product categories and category photos</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors text-sm font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] bg-white rounded-3xl border border-gray-200">
          <FolderTree className="w-12 h-12 text-gray-300 mb-4" />
          <h2 className="text-lg font-bold text-gray-900">No categories yet</h2>
          <p className="text-gray-500 mb-6">Add your first category to start organizing products.</p>
          <button
            onClick={() => handleOpenModal()}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-black transition-colors"
          >
            Add Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {categories.sort((a,b) => a.sort_order - b.sort_order).map(category => (
            <div key={category.id} className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between">
              <div>
                {/* Category Image Banner */}
                <div className="w-full h-44 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden mb-4 p-3 relative">
                  {category.image_url ? (
                    <img src={category.image_url} alt={category.name} className="h-full w-full object-contain transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-300">
                      <ImageIcon className="w-10 h-10 mb-1.5" />
                      <span className="text-xs font-semibold">No Image Uploaded</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-1 bg-white/90 backdrop-blur-xs p-1 rounded-xl shadow-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenModal(category)}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(category.id, category.name)}
                      className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{category.name}</h3>
                <p className="text-xs font-mono text-gray-400 mb-2">/{category.slug}</p>
                {category.description && (
                  <p className="text-xs text-gray-600 line-clamp-2">{category.description}</p>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>Display Order: {category.sort_order}</span>
                <button
                  onClick={() => handleOpenModal(category)}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Edit Category →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-bold text-lg text-gray-900">
                {editingId ? "Edit Category" : "Add New Category"}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 p-1">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Category Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleNameChange}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                  placeholder="e.g. RC Cars"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Slug *</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                  placeholder="e.g. rc-cars"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all resize-none h-20"
                  placeholder="Brief description of the category"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Category Image</label>
                <p className="text-xs text-gray-500 mb-2">Upload or drag a photo for this category (converted to WebP automatically)</p>
                <ImageUploader
                  value={formData.image_url ? [formData.image_url] : []}
                  onChange={(urls) => setFormData({ ...formData, image_url: urls[0] || "" })}
                  maxImages={1}
                  folder="categories"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Sort Order</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                />
              </div>

              <div className="pt-4 mt-2 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSaving ? "Saving..." : editingId ? "Save Changes" : "Create Category"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
