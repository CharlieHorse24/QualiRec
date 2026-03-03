import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useSessionStore } from '@/store/sessionStore';
import { api } from '@/lib/api';
import type { Template, ContactType, VoipAdapterInfo } from '@qualirec/shared';
import { Phone, User, Building2, ArrowRight, Wifi, Mic } from 'lucide-react';

export function NewCallPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedType, setSelectedType] = useState<ContactType>('CANDIDATE');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // VOIP adapter selection
  const [voipAdapters, setVoipAdapters] = useState<VoipAdapterInfo[]>([]);
  const [selectedVoip, setSelectedVoip] = useState('manual');
  const [meetLink, setMeetLink] = useState('');

  const { startSession } = useSessionStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
    loadVoipAdapters();
  }, []);

  useEffect(() => {
    const defaultTemplate = templates.find(
      (t) => t.type === selectedType && t.isDefault,
    );
    if (defaultTemplate) {
      setSelectedTemplateId(defaultTemplate.id);
    } else {
      const first = templates.find((t) => t.type === selectedType);
      setSelectedTemplateId(first?.id || '');
    }
  }, [selectedType, templates]);

  async function loadTemplates() {
    try {
      const res = await api.getTemplates();
      if (res.success && res.data) {
        setTemplates(res.data);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  }

  async function loadVoipAdapters() {
    try {
      const res = await api.getVoipAdapters();
      if (res.success && res.data) {
        setVoipAdapters(res.data);
        // Auto-select a configured adapter other than manual
        const configured = res.data.filter((a) => a.isConfigured && a.name !== 'manual');
        if (configured.length > 0) {
          // Prefer dialpad or googlemeet if available
          const preferred = configured.find((a) => a.name === 'dialpad' || a.name === 'googlemeet');
          setSelectedVoip(preferred?.name || configured[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load VOIP adapters:', err);
    }
  }

  async function handleStartCall() {
    if (!selectedTemplateId) return;
    setIsLoading(true);

    const sessionId = await startSession({
      templateId: selectedTemplateId,
      contactType: selectedType,
      contactName: contactName || undefined,
      contactEmail: contactEmail || undefined,
      contactPhone: contactPhone || undefined,
      voipAdapter: selectedVoip,
    });

    if (sessionId) {
      navigate(`/call/${sessionId}`);
    }
    setIsLoading(false);
  }

  const filteredTemplates = templates.filter((t) => t.type === selectedType);
  const selectedAdapterInfo = voipAdapters.find((a) => a.name === selectedVoip);
  const configuredAdapters = voipAdapters.filter((a) => a.isConfigured || a.name === 'manual');

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">New Call Session</h1>
        <p className="text-gray-500 mt-1">Set up your qualification call</p>
      </div>

      {/* Contact Type Selection */}
      <Card>
        <CardTitle className="mb-4">Contact Type</CardTitle>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedType('CANDIDATE')}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedType === 'CANDIDATE'
                ? 'border-brand-500 bg-brand-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <User className={`w-8 h-8 mb-2 ${selectedType === 'CANDIDATE' ? 'text-brand-600' : 'text-gray-400'}`} />
            <p className="font-medium text-navy-900">Candidate</p>
            <p className="text-xs text-gray-500 mt-1">Qualify a job seeker</p>
          </button>
          <button
            onClick={() => setSelectedType('CLIENT')}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedType === 'CLIENT'
                ? 'border-brand-500 bg-brand-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Building2 className={`w-8 h-8 mb-2 ${selectedType === 'CLIENT' ? 'text-brand-600' : 'text-gray-400'}`} />
            <p className="font-medium text-navy-900">Client</p>
            <p className="text-xs text-gray-500 mt-1">Qualify a hiring company</p>
          </button>
        </div>
      </Card>

      {/* Template Selection */}
      <Card>
        <CardTitle className="mb-4">Qualification Template</CardTitle>
        <div className="space-y-3">
          {filteredTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplateId(template.id)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedTemplateId === template.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-navy-900">{template.name}</p>
                <div className="flex gap-2">
                  {template.isDefault && <Badge variant="info">Default</Badge>}
                  <Badge>{(template.sections as unknown[]).length} sections</Badge>
                </div>
              </div>
              {template.description && (
                <p className="text-sm text-gray-500 mt-1">{template.description}</p>
              )}
            </button>
          ))}
          {filteredTemplates.length === 0 && (
            <p className="text-center text-gray-400 py-4">No templates available for this type</p>
          )}
        </div>
      </Card>

      {/* Contact Info (Optional) */}
      <Card>
        <CardTitle className="mb-4">Contact Information (Optional)</CardTitle>
        <p className="text-sm text-gray-500 mb-4">
          Pre-fill contact details if known. Can also be auto-detected from the call transcript.
        </p>
        <div className="space-y-3">
          <Input
            label="Name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Contact name"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="email@example.com"
            />
            <Input
              label="Phone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>
      </Card>

      {/* VOIP / Call Mode Selection */}
      <Card>
        <CardTitle className="mb-4">
          <Phone className="w-5 h-5 inline mr-2 text-brand-600" />
          Call Mode
        </CardTitle>
        <div className="space-y-3">
          {configuredAdapters.map((adapter) => (
            <button
              key={adapter.name}
              onClick={() => setSelectedVoip(adapter.name)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedVoip === adapter.name
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wifi className={`w-5 h-5 ${selectedVoip === adapter.name ? 'text-brand-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-medium text-navy-900">{adapter.displayName}</p>
                    <p className="text-xs text-gray-500">
                      {adapter.name === 'manual'
                        ? 'No integration — use live transcription from your microphone'
                        : adapter.name === 'dialpad'
                          ? 'Auto-detect calls via Dialpad'
                          : adapter.name === 'googlemeet'
                            ? 'Google Meet with calendar detection'
                            : `Connected via ${adapter.displayName}`}
                    </p>
                  </div>
                </div>
                {adapter.name !== 'manual' && (
                  <Badge variant="success">Connected</Badge>
                )}
              </div>
            </button>
          ))}

          {/* Google Meet link input */}
          {selectedVoip === 'googlemeet' && (
            <div className="pl-10">
              <Input
                label="Google Meet Link (Optional)"
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
              />
              <p className="text-xs text-gray-400 mt-1">
                Paste a Meet link or leave blank to auto-detect from your calendar
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Start Session Banner */}
      <Card className="bg-navy-900 text-white border-navy-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-navy-800 rounded-lg">
              <Mic className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="font-medium">
                {selectedAdapterInfo?.displayName || 'Manual Mode'}
              </p>
              <p className="text-sm text-navy-400">
                Live transcription will auto-fill qualification answers from your call
              </p>
            </div>
          </div>
          <Button
            onClick={handleStartCall}
            loading={isLoading}
            disabled={!selectedTemplateId}
            className="bg-brand-500 hover:bg-brand-600"
          >
            Start Session <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
