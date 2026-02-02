import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Edit2, Trash2, Copy, Zap, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { templateService, type Template } from '../../services/templateService';

export const TemplateLibrary = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    category: 'custom',
    message: '',
    variables: [] as string[]
  });

  const categories = [
    { value: 'all', label: 'All Templates' },
    { value: 'initial_contact', label: '👋 Initial Contact' },
    { value: 'follow_up', label: '📱 Follow-up' },
    { value: 'appointment', label: '📅 Appointment' },
    { value: 'closing', label: '🤝 Closing' },
    { value: 're_engagement', label: '🔄 Re-engagement' },
    { value: 'thank_you', label: '🙏 Thank You' },
    { value: 'custom', label: '✏️ Custom' }
  ];

  const availableVariables = [
    'FirstName',
    'LastName',
    'FullName',
    'Company',
    'Email',
    'Phone',
    'PropertyType',
    'Budget',
    'Location'
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await templateService.getTemplates();
      setTemplates(data);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!formData.name || !formData.message) {
      toast.error('Name and message are required');
      return;
    }

    try {
      if (editingId) {
        await templateService.updateTemplate(editingId, {
          name: formData.name,
          category: formData.category as 'initial_contact' | 'follow_up' | 'appointment' | 'closing' | 're_engagement' | 'thank_you' | 'custom',
          message: formData.message,
          variables: formData.variables
        });
        toast.success('Template updated');
      } else {
        await templateService.createTemplate(formData);
        toast.success('Template created');
      }
      setFormData({ name: '', category: 'custom', message: '', variables: [] });
      setEditingId(null);
      setIsCreateOpen(false);
      await loadTemplates();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save template');
    }
  };

  const handleEdit = (template: Template) => {
    setFormData({
      name: template.name,
      category: template.category,
      message: template.message,
      variables: template.variables
    });
    setEditingId(template._id);
    setIsCreateOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;

    try {
      await templateService.deleteTemplate(id);
      toast.success('Template deleted');
      await loadTemplates();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete template');
    }
  };

  const handleCopyTemplate = (template: Template) => {
    setFormData({
      name: `${template.name} (Copy)`,
      category: template.category,
      message: template.message,
      variables: template.variables
    });
    setEditingId(null);
    setIsCreateOpen(true);
  };

  const filteredTemplates = templates.filter(t => 
    selectedCategory === 'all' || t.category === selectedCategory
  );

  const systemTemplates = filteredTemplates.filter(t => t.isSystem);
  const userTemplates = filteredTemplates.filter(t => !t.isSystem);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Message Templates</h2>
          <p className="text-slate-600 mt-1">Save time with pre-written messages with variable support</p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: '', category: 'custom', message: '', variables: [] });
            setEditingId(null);
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          New Template
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* System Templates Section */}
      {systemTemplates.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Zap size={16} />
            System Templates (Free)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemTemplates.map(template => (
              <motion.div
                key={template._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900">{template.name}</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      {categories.find(c => c.value === template.category)?.label}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyTemplate(template)}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Duplicate template"
                  >
                    <Copy size={16} className="text-blue-600" />
                  </button>
                </div>

                <p className="text-sm text-slate-700 bg-white bg-opacity-50 p-3 rounded mb-3 max-h-24 overflow-hidden line-clamp-3">
                  {template.message}
                </p>

                {template.variables.length > 0 && (
                  <div className="text-xs text-slate-600">
                    <strong>Variables:</strong> {template.variables.join(', ')}
                  </div>
                )}

                {template.usageCount > 0 && (
                  <div className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                    <TrendingUp size={14} />
                    Used {template.usageCount} times
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* User Templates Section */}
      {userTemplates.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-3">My Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userTemplates.map(template => (
              <motion.div
                key={template._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900">{template.name}</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      {categories.find(c => c.value === template.category)?.label}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Edit template"
                    >
                      <Edit2 size={16} className="text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(template._id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete template"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded mb-3 max-h-24 overflow-hidden line-clamp-3">
                  {template.message}
                </p>

                {template.variables.length > 0 && (
                  <div className="text-xs text-slate-600">
                    <strong>Variables:</strong> {template.variables.join(', ')}
                  </div>
                )}

                {template.usageCount > 0 && (
                  <div className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                    <TrendingUp size={14} />
                    Used {template.usageCount} times
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredTemplates.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <p className="text-slate-600">No templates found. Create your first template!</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[200]"
            >
              <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-blue-100 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {editingId ? 'Edit Template' : 'Create Template'}
                  </h2>
                  <button
                    onClick={() => setIsCreateOpen(false)}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Form */}
                <div className="p-8 space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Initial Contact"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="initial_contact">Initial Contact</option>
                      <option value="follow_up">Follow-up</option>
                      <option value="appointment">Appointment</option>
                      <option value="closing">Closing</option>
                      <option value="re_engagement">Re-engagement</option>
                      <option value="thank_you">Thank You</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      Message
                      <span className="text-xs text-slate-600 ml-2">
                        Use {'{'}'{'{'}Variable{'}'}{'}'} to add variables
                      </span>
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Enter your message here..."
                      rows={8}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                  </div>

                  {/* Variables */}
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      Variables to Include
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableVariables.map(variable => (
                        <label
                          key={variable}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.variables.includes(variable)}
                            onChange={e => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  variables: [...formData.variables, variable]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  variables: formData.variables.filter(v => v !== variable)
                                });
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-slate-700">{'{' + variable + '}'}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  {formData.message && (
                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-2">
                        Preview
                      </label>
                      <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                        {formData.message}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-slate-50 px-8 py-4 border-t border-slate-200 flex gap-3 justify-end">
                  <button
                    onClick={() => setIsCreateOpen(false)}
                    className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTemplate}
                    className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
                  >
                    {editingId ? 'Update Template' : 'Create Template'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
