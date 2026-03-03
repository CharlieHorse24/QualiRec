import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import type { VoipAdapterInfo } from '@qualirec/shared';
import {
  Settings,
  Phone,
  Database,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  Key,
  Trash2,
  Save,
  ExternalLink,
} from 'lucide-react';

interface CrmAdapterInfo {
  name: string;
  isConfigured: boolean;
  hasStoredCredentials: boolean;
}

// Credential schemas for each adapter
const ADAPTER_CREDENTIALS: Record<string, Array<{ key: string; label: string; placeholder: string; helpText?: string }>> = {
  // CRM
  hubspot: [
    {
      key: 'accessToken',
      label: 'Private App Access Token',
      placeholder: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      helpText: 'From HubSpot > Settings > Integrations > Private Apps > Create a private app with CRM scopes (contacts, notes, calls, tasks)',
    },
  ],
  // VOIP
  dialpad: [
    {
      key: 'apiKey',
      label: 'Dialpad API Key',
      placeholder: 'Your Dialpad API key',
      helpText: 'From Dialpad Admin > Company Settings > API & Webhooks',
    },
  ],
  googlemeet: [
    {
      key: 'clientId',
      label: 'Google OAuth Client ID',
      placeholder: 'xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
      helpText: 'From Google Cloud Console > APIs & Services > Credentials',
    },
    {
      key: 'clientSecret',
      label: 'Google OAuth Client Secret',
      placeholder: 'GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
    {
      key: 'refreshToken',
      label: 'Google Refresh Token',
      placeholder: '1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      helpText: 'Obtained via OAuth2 consent flow with calendar.readonly scope',
    },
  ],
  zoom: [
    { key: 'clientId', label: 'Zoom Client ID', placeholder: 'Your Zoom App Client ID' },
    { key: 'clientSecret', label: 'Zoom Client Secret', placeholder: 'Your Zoom App Client Secret' },
    { key: 'webhookSecret', label: 'Zoom Webhook Secret', placeholder: 'Your Zoom Webhook Secret Token' },
  ],
  twilio: [
    { key: 'accountSid', label: 'Twilio Account SID', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
    { key: 'authToken', label: 'Twilio Auth Token', placeholder: 'Your Twilio Auth Token' },
  ],
  teams: [
    { key: 'clientId', label: 'Azure App Client ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { key: 'clientSecret', label: 'Azure App Client Secret', placeholder: 'Your Azure AD Client Secret' },
    { key: 'tenantId', label: 'Azure Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
  ],
};

export function AdminSettingsPage() {
  const [voipAdapters, setVoipAdapters] = useState<VoipAdapterInfo[]>([]);
  const [crmAdapters, setCrmAdapters] = useState<CrmAdapterInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Configuration modal state
  const [configModal, setConfigModal] = useState<{
    open: boolean;
    adapterType: 'VOIP' | 'CRM';
    adapterName: string;
    displayName: string;
  } | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadAdapters();
  }, []);

  async function loadAdapters() {
    setIsLoading(true);
    try {
      const [voipRes, crmRes] = await Promise.all([
        api.getVoipAdapters(),
        api.getCrmAdapters(),
      ]);
      if (voipRes.success && voipRes.data) setVoipAdapters(voipRes.data);
      if (crmRes.success && crmRes.data) setCrmAdapters(crmRes.data as CrmAdapterInfo[]);
    } catch (err) {
      console.error('Failed to load adapters:', err);
    }
    setIsLoading(false);
  }

  function openConfigModal(adapterType: 'VOIP' | 'CRM', adapterName: string, displayName: string) {
    setConfigModal({ open: true, adapterType, adapterName, displayName });
    setCredentials({});
    setSaveSuccess(false);
  }

  async function handleSaveCredentials() {
    if (!configModal) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await api.saveIntegrationConfig({
        adapterType: configModal.adapterType,
        adapterName: configModal.adapterName,
        credentials,
      });

      if (res.success) {
        setSaveSuccess(true);
        await loadAdapters();
        setTimeout(() => {
          setConfigModal(null);
          setSaveSuccess(false);
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to save credentials:', err);
    }
    setIsSaving(false);
  }

  async function handleDisconnect(adapterType: 'VOIP' | 'CRM', adapterName: string) {
    if (!confirm(`Disconnect ${adapterName}? This will remove the stored credentials.`)) return;

    try {
      await api.deleteIntegrationConfig(adapterType, adapterName);
      await loadAdapters();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  }

  const credentialFields = configModal ? ADAPTER_CREDENTIALS[configModal.adapterName] || [] : [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure integrations and organization settings</p>
      </div>

      {/* CRM Integrations — shown first since HubSpot is top priority */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Database className="w-5 h-5 inline mr-2 text-brand-600" />
            CRM Integrations
          </CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {crmAdapters.map((adapter) => {
            const displayName = adapter.name === 'mock'
              ? 'Local CRM (Mock)'
              : adapter.name.charAt(0).toUpperCase() + adapter.name.slice(1);
            const description = adapter.name === 'mock'
              ? 'PostgreSQL-backed local CRM for development'
              : adapter.name === 'hubspot'
                ? 'Connect to HubSpot CRM for contact sync, notes, and call logging'
                : adapter.name === 'salesforce'
                  ? 'Connect to Salesforce for contact management'
                  : `Connect to ${displayName}`;

            return (
              <div key={adapter.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${adapter.hasStoredCredentials || adapter.name === 'mock' ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <Database className={`w-5 h-5 ${adapter.hasStoredCredentials || adapter.name === 'mock' ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-navy-900">{displayName}</p>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {adapter.name === 'mock' ? (
                    <Badge variant="default">Fallback</Badge>
                  ) : adapter.hasStoredCredentials ? (
                    <>
                      <Badge variant="success">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Connected
                      </Badge>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDisconnect('CRM', adapter.name)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge variant="default">
                        <XCircle className="w-3 h-3 mr-1" />
                        Not Connected
                      </Badge>
                      {ADAPTER_CREDENTIALS[adapter.name] && (
                        <Button
                          size="sm"
                          onClick={() => openConfigModal('CRM', adapter.name, displayName)}
                        >
                          <Key className="w-3 h-3 mr-1" />
                          Connect
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* VOIP Adapters */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Phone className="w-5 h-5 inline mr-2 text-brand-600" />
            VOIP / Meeting Integrations
          </CardTitle>
        </CardHeader>
        {isLoading ? (
          <div className="animate-spin w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full mx-auto" />
        ) : (
          <div className="space-y-3">
            {voipAdapters.map((adapter) => {
              const hasCredSchema = !!ADAPTER_CREDENTIALS[adapter.name];
              const isConfiguredOrStored = adapter.isConfigured || (adapter as unknown as { hasStoredCredentials?: boolean }).hasStoredCredentials;

              return (
                <div key={adapter.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isConfiguredOrStored ? 'bg-brand-50' : 'bg-gray-50'}`}>
                      {isConfiguredOrStored ? (
                        <Wifi className="w-5 h-5 text-brand-600" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-navy-900">{adapter.displayName}</p>
                      <p className="text-xs text-gray-500">
                        {adapter.name === 'manual'
                          ? 'No integration — manually track your calls'
                          : adapter.name === 'dialpad'
                            ? 'Auto-detect calls via Dialpad webhook'
                            : adapter.name === 'googlemeet'
                              ? 'Detect Google Meet meetings from calendar'
                              : adapter.requiresOAuth
                                ? 'Requires OAuth setup'
                                : 'Requires API credentials'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {adapter.name === 'manual' ? (
                      <Badge variant="success">Always Available</Badge>
                    ) : isConfiguredOrStored ? (
                      <>
                        <Badge variant="success">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Configured
                        </Badge>
                        {hasCredSchema && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDisconnect('VOIP', adapter.name)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Disconnect
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <Badge variant="default">
                          <XCircle className="w-3 h-3 mr-1" />
                          Not Configured
                        </Badge>
                        {hasCredSchema && (
                          <Button
                            size="sm"
                            onClick={() => openConfigModal('VOIP', adapter.name, adapter.displayName)}
                          >
                            <Key className="w-3 h-3 mr-1" />
                            Configure
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Webhook URLs */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Settings className="w-5 h-5 inline mr-2 text-brand-600" />
            Webhook URLs
          </CardTitle>
        </CardHeader>
        <p className="text-sm text-gray-500 mb-3">
          Configure these URLs in your VOIP provider's webhook settings to receive call events.
        </p>
        <div className="space-y-3">
          {[
            { name: 'Dialpad Webhook', path: '/api/webhooks/dialpad' },
            { name: 'Google Calendar Push', path: '/api/webhooks/googlemeet' },
            { name: 'Zoom Webhook', path: '/api/webhooks/zoom' },
            { name: 'Twilio Voice Webhook', path: '/api/webhooks/twilio' },
            { name: 'Teams Change Notification', path: '/api/webhooks/teams' },
          ].map(({ name, path }) => (
            <div key={path} className="p-3 bg-gray-50 rounded-md">
              <p className="text-xs font-medium text-gray-500 mb-1">{name}</p>
              <code className="text-sm text-navy-800 break-all">
                {window.location.origin}{path}
              </code>
            </div>
          ))}
        </div>
      </Card>

      {/* Credential Configuration Modal */}
      {configModal && (
        <Modal
          isOpen={configModal.open}
          onClose={() => setConfigModal(null)}
          title={`Connect ${configModal.displayName}`}
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your {configModal.displayName} credentials to enable the integration.
            </p>

            {credentialFields.map((field) => (
              <div key={field.key}>
                <Input
                  label={field.label}
                  type="password"
                  value={credentials[field.key] || ''}
                  onChange={(e) =>
                    setCredentials({ ...credentials, [field.key]: e.target.value })
                  }
                  placeholder={field.placeholder}
                />
                {field.helpText && (
                  <p className="text-xs text-gray-400 mt-1">{field.helpText}</p>
                )}
              </div>
            ))}

            {saveSuccess && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                Credentials saved successfully!
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSaveCredentials}
                loading={isSaving}
                disabled={credentialFields.some((f) => !credentials[f.key])}
              >
                <Save className="w-4 h-4 mr-1" />
                Save & Connect
              </Button>
              <Button variant="secondary" onClick={() => setConfigModal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
