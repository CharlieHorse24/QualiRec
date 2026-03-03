import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Template, TemplateType, TemplateSection } from '@qualirec/shared';
import {
  Plus,
  Copy,
  Archive,
  FileText,
  Star,
  Edit3,
  Eye,
  GripVertical,
} from 'lucide-react';

export function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  // Create form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<TemplateType>('CANDIDATE');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setIsLoading(true);
    try {
      const res = await api.getTemplates({ includeArchived: false });
      if (res.success && res.data) setTemplates(res.data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
    setIsLoading(false);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      await api.createTemplate({
        name: newName,
        type: newType,
        description: newDescription,
        sections: [{
          title: 'Section 1',
          order: 0,
          questions: [{
            text: 'First question',
            responseType: 'FREE_TEXT',
            required: false,
            flagForCRM: false,
            order: 0,
          }],
        }],
        isDraft: true,
      });
      setShowCreateModal(false);
      setNewName('');
      setNewDescription('');
      loadTemplates();
    } catch (err) {
      console.error('Failed to create template:', err);
    }
    setIsCreating(false);
  }

  async function handleClone(id: string) {
    try {
      await api.cloneTemplate(id);
      loadTemplates();
    } catch (err) {
      console.error('Failed to clone template:', err);
    }
  }

  async function handleArchive(id: string) {
    try {
      await api.archiveTemplate(id);
      loadTemplates();
    } catch (err) {
      console.error('Failed to archive template:', err);
    }
  }

  function handlePreview(template: Template) {
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  }

  const filteredTemplates = filter
    ? templates.filter((t) => t.type === filter)
    : templates;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Templates</h1>
          <p className="text-gray-500 mt-1">Manage your qualification call templates</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['', 'CANDIDATE', 'CLIENT', 'CUSTOM'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === type
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            {type || 'All'} {type && `(${templates.filter((t) => t.type === type).length})`}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-600" />
                  <Badge variant={template.type === 'CANDIDATE' ? 'info' : template.type === 'CLIENT' ? 'default' : 'warning'}>
                    {template.type}
                  </Badge>
                  {template.isDefault && (
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  )}
                  {template.isDraft && (
                    <Badge variant="warning">Draft</Badge>
                  )}
                </div>
              </div>

              <h3 className="font-semibold text-navy-900 mb-1">{template.name}</h3>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{template.description || 'No description'}</p>

              <div className="text-xs text-gray-400 mb-4">
                {(template.sections as unknown as TemplateSection[]).length} sections | v{template.version} | {formatDate(template.updatedAt)}
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => handlePreview(template)}>
                  <Eye className="w-3 h-3 mr-1" />
                  Preview
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/templates/${template.id}/edit`)}>
                  <Edit3 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleClone(template.id)}>
                  <Copy className="w-3 h-3 mr-1" />
                  Clone
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleArchive(template.id)}>
                  <Archive className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Template">
        <div className="space-y-4">
          <Input
            label="Template Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Senior Engineer Qualification"
            autoFocus
          />
          <Select
            label="Type"
            value={newType}
            onChange={(e) => setNewType(e.target.value as TemplateType)}
            options={[
              { value: 'CANDIDATE', label: 'Candidate' },
              { value: 'CLIENT', label: 'Client' },
              { value: 'CUSTOM', label: 'Custom' },
            ]}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-navy-700">Description</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="input-field min-h-[80px]"
              placeholder="Brief description of this template..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={isCreating} disabled={!newName.trim()}>
              Create Template
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title={previewTemplate?.name || 'Preview'}
        size="lg"
      >
        {previewTemplate && (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">{previewTemplate.description}</p>
            {(previewTemplate.sections as unknown as TemplateSection[]).map((section, si) => (
              <div key={section.id || si}>
                <h4 className="font-medium text-navy-800 mb-3 pb-2 border-b">
                  {section.title}
                </h4>
                <div className="space-y-3">
                  {section.questions.map((q, qi) => (
                    <div key={q.id || qi} className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
                      <span className="text-xs text-gray-400 mt-0.5">{qi + 1}.</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-navy-900">
                          {q.text} {q.required && <span className="text-red-500">*</span>}
                        </p>
                        {q.hint && <p className="text-xs text-gray-400 mt-1">{q.hint}</p>}
                        <div className="flex gap-2 mt-2">
                          <Badge>{q.responseType}</Badge>
                          {q.flagForCRM && <Badge variant="info">CRM</Badge>}
                        </div>
                        {q.options && q.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {q.options.map((opt) => (
                              <span key={opt} className="px-2 py-0.5 bg-white border rounded text-xs">
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
