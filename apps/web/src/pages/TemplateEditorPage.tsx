import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import type { Template, TemplateSection, TemplateQuestion, ResponseType } from '@qualirec/shared';
import { v4 as uuid } from 'uuid';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Settings2,
} from 'lucide-react';

// Simple UUID generator for the browser
function genId() {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

export function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadTemplate();
  }, [id]);

  async function loadTemplate() {
    setIsLoading(true);
    try {
      const res = await api.getTemplate(id!);
      if (res.success && res.data) {
        setTemplate(res.data);
        setName(res.data.name);
        setDescription(res.data.description);
        const secs = res.data.sections as unknown as TemplateSection[];
        setSections(secs);
        if (secs.length > 0) setExpandedSection(secs[0].id);
      }
    } catch (err) {
      console.error('Failed to load template:', err);
    }
    setIsLoading(false);
  }

  async function handleSave(publish = false) {
    setIsSaving(true);
    try {
      await api.updateTemplate(id!, {
        name,
        description,
        sections: sections as unknown as TemplateSection[],
        isDraft: !publish,
      });
      if (publish) {
        navigate('/templates');
      }
    } catch (err) {
      console.error('Failed to save:', err);
    }
    setIsSaving(false);
  }

  function addSection() {
    const newSection: TemplateSection = {
      id: genId(),
      title: `Section ${sections.length + 1}`,
      order: sections.length,
      questions: [],
    };
    setSections([...sections, newSection]);
    setExpandedSection(newSection.id);
  }

  function removeSection(sectionId: string) {
    setSections(sections.filter((s) => s.id !== sectionId));
  }

  function updateSection(sectionId: string, updates: Partial<TemplateSection>) {
    setSections(sections.map((s) => s.id === sectionId ? { ...s, ...updates } : s));
  }

  function moveSection(sectionId: string, direction: 'up' | 'down') {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (direction === 'up' && idx > 0) {
      const newSections = [...sections];
      [newSections[idx - 1], newSections[idx]] = [newSections[idx], newSections[idx - 1]];
      setSections(newSections.map((s, i) => ({ ...s, order: i })));
    } else if (direction === 'down' && idx < sections.length - 1) {
      const newSections = [...sections];
      [newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]];
      setSections(newSections.map((s, i) => ({ ...s, order: i })));
    }
  }

  function addQuestion(sectionId: string) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    const newQuestion: TemplateQuestion = {
      id: genId(),
      text: '',
      responseType: 'FREE_TEXT',
      options: [],
      required: false,
      flagForCRM: false,
      order: section.questions.length,
    };

    updateSection(sectionId, {
      questions: [...section.questions, newQuestion],
    });
  }

  function updateQuestion(sectionId: string, questionId: string, updates: Partial<TemplateQuestion>) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    updateSection(sectionId, {
      questions: section.questions.map((q) =>
        q.id === questionId ? { ...q, ...updates } : q,
      ),
    });
  }

  function removeQuestion(sectionId: string, questionId: string) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    updateSection(sectionId, {
      questions: section.questions.filter((q) => q.id !== questionId),
    });
  }

  function moveQuestion(sectionId: string, questionId: string, direction: 'up' | 'down') {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    const idx = section.questions.findIndex((q) => q.id === questionId);
    const questions = [...section.questions];

    if (direction === 'up' && idx > 0) {
      [questions[idx - 1], questions[idx]] = [questions[idx], questions[idx - 1]];
    } else if (direction === 'down' && idx < questions.length - 1) {
      [questions[idx], questions[idx + 1]] = [questions[idx + 1], questions[idx]];
    }

    updateSection(sectionId, { questions: questions.map((q, i) => ({ ...q, order: i })) });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/templates')} className="p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Edit Template</h1>
            <p className="text-sm text-gray-500">v{template?.version || 1}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => handleSave(false)} loading={isSaving}>
            <Save className="w-4 h-4 mr-1" />
            Save Draft
          </Button>
          <Button onClick={() => handleSave(true)} loading={isSaving}>
            Publish
          </Button>
        </div>
      </div>

      {/* Template Details */}
      <Card>
        <div className="space-y-4">
          <Input
            label="Template Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-navy-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field min-h-[60px]"
              placeholder="Describe the purpose of this template..."
            />
          </div>
        </div>
      </Card>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, si) => (
          <Card key={section.id} padding={false}>
            {/* Section Header */}
            <div
              className="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
            >
              <GripVertical className="w-4 h-4 text-gray-400" />
              <Input
                value={section.title}
                onChange={(e) => {
                  e.stopPropagation();
                  updateSection(section.id, { title: e.target.value });
                }}
                onClick={(e) => e.stopPropagation()}
                className="font-medium flex-1"
              />
              <Badge>{section.questions.length} questions</Badge>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => moveSection(section.id, 'up')} disabled={si === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={() => moveSection(section.id, 'down')} disabled={si === sections.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button onClick={() => removeSection(section.id)} className="p-1 hover:bg-red-100 text-red-500 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {expandedSection === section.id ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>

            {/* Questions */}
            {expandedSection === section.id && (
              <div className="px-6 pb-4 space-y-3 border-t">
                {section.questions.map((question, qi) => (
                  <div key={question.id} className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-gray-400 mt-2">{qi + 1}</span>
                      <div className="flex-1 space-y-3">
                        <Input
                          value={question.text}
                          onChange={(e) => updateQuestion(section.id, question.id, { text: e.target.value })}
                          placeholder="Question text..."
                        />
                        <Input
                          value={question.hint || ''}
                          onChange={(e) => updateQuestion(section.id, question.id, { hint: e.target.value })}
                          placeholder="Hint/coaching note (optional)"
                          className="text-xs"
                        />
                        <div className="flex gap-3 flex-wrap">
                          <Select
                            value={question.responseType}
                            onChange={(e) => updateQuestion(section.id, question.id, {
                              responseType: e.target.value as ResponseType,
                            })}
                            options={[
                              { value: 'FREE_TEXT', label: 'Free Text' },
                              { value: 'SINGLE_SELECT', label: 'Single Select' },
                              { value: 'MULTI_SELECT', label: 'Multi Select' },
                              { value: 'NUMERIC', label: 'Numeric' },
                              { value: 'DATE', label: 'Date' },
                              { value: 'YES_NO', label: 'Yes/No' },
                            ]}
                          />
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={question.required}
                              onChange={(e) => updateQuestion(section.id, question.id, { required: e.target.checked })}
                              className="rounded"
                            />
                            Required
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={question.flagForCRM}
                              onChange={(e) => updateQuestion(section.id, question.id, { flagForCRM: e.target.checked })}
                              className="rounded"
                            />
                            Map to CRM
                          </label>
                        </div>
                        {question.flagForCRM && (
                          <Input
                            value={question.crmFieldMapping || ''}
                            onChange={(e) => updateQuestion(section.id, question.id, { crmFieldMapping: e.target.value })}
                            placeholder="CRM field key (e.g. contact.current_salary)"
                            className="text-xs"
                          />
                        )}
                        {['SINGLE_SELECT', 'MULTI_SELECT'].includes(question.responseType) && (
                          <Input
                            value={(question.options || []).join(', ')}
                            onChange={(e) => updateQuestion(section.id, question.id, {
                              options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean),
                            })}
                            placeholder="Options (comma-separated)"
                          />
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => moveQuestion(section.id, question.id, 'up')} disabled={qi === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => moveQuestion(section.id, question.id, 'down')} disabled={qi === section.questions.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeQuestion(section.id, question.id)} className="p-1 hover:bg-red-100 text-red-500 rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => addQuestion(section.id)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Question
                </Button>
              </div>
            )}
          </Card>
        ))}

        <Button variant="secondary" onClick={addSection} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Section
        </Button>
      </div>
    </div>
  );
}
