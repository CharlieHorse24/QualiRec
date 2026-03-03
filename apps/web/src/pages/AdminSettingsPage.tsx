import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
} from 'lucide-react';

export function AdminSettingsPage() {
  const [voipAdapters, setVoipAdapters] = useState<VoipAdapterInfo[]>([]);
  const [crmAdapters, setCrmAdapters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      if (crmRes.success && crmRes.data) setCrmAdapters(crmRes.data);
    } catch (err) {
      console.error('Failed to load adapters:', err);
    }
    setIsLoading(false);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure integrations and organization settings</p>
      </div>

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
            {voipAdapters.map((adapter) => (
              <div key={adapter.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${adapter.isConfigured ? 'bg-brand-50' : 'bg-gray-50'}`}>
                    {adapter.isConnected ? (
                      <Wifi className="w-5 h-5 text-brand-600" />
                    ) : (
                      <WifiOff className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-navy-900">{adapter.displayName}</p>
                    <p className="text-xs text-gray-500">
                      {adapter.requiresOAuth ? 'Requires OAuth setup' : 'No configuration required'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {adapter.isConfigured ? (
                    <Badge variant="success">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="default">
                      <XCircle className="w-3 h-3 mr-1" />
                      Not Configured
                    </Badge>
                  )}
                  {adapter.requiresOAuth && !adapter.isConfigured && (
                    <Button size="sm" variant="secondary">Configure</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* CRM Adapters */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Database className="w-5 h-5 inline mr-2 text-brand-600" />
            CRM Integrations
          </CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {crmAdapters.map((name) => (
            <div key={name} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${name === 'mock' ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <Database className={`w-5 h-5 ${name === 'mock' ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-medium text-navy-900 capitalize">{name === 'mock' ? 'Local CRM (Mock)' : name}</p>
                  <p className="text-xs text-gray-500">
                    {name === 'mock' ? 'PostgreSQL-backed local CRM for development' : `Requires OAuth setup`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {name === 'mock' ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="default">Not Configured</Badge>
                )}
                {name !== 'mock' && (
                  <Button size="sm" variant="secondary">Configure</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Webhook URLs */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Settings className="w-5 h-5 inline mr-2 text-brand-600" />
            Webhook URLs
          </CardTitle>
        </CardHeader>
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-xs font-medium text-gray-500 mb-1">Zoom Webhook</p>
            <code className="text-sm text-navy-800 break-all">
              {window.location.origin}/api/webhooks/zoom
            </code>
          </div>
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-xs font-medium text-gray-500 mb-1">Teams Change Notification</p>
            <code className="text-sm text-navy-800 break-all">
              {window.location.origin}/api/webhooks/teams
            </code>
          </div>
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-xs font-medium text-gray-500 mb-1">Twilio Voice Webhook</p>
            <code className="text-sm text-navy-800 break-all">
              {window.location.origin}/api/webhooks/twilio
            </code>
          </div>
        </div>
      </Card>
    </div>
  );
}
