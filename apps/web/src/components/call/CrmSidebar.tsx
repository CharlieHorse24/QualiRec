import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import type { CallSession, CrmContact } from '@qualirec/shared';
import { X, User, Building2, Mail, Phone, ExternalLink } from 'lucide-react';

interface CrmSidebarProps {
  session: CallSession;
  onClose: () => void;
}

export function CrmSidebar({ session, onClose }: CrmSidebarProps) {
  const [contact, setContact] = useState<CrmContact | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAdapter, setActiveAdapter] = useState<string>('mock');

  useEffect(() => {
    loadActiveAdapter();
  }, []);

  useEffect(() => {
    if (session.crmContactId) {
      loadContact(session.crmContactId);
    } else if (session.contactEmail || session.contactName) {
      searchContact();
    }
  }, [session.crmContactId, session.contactEmail, session.contactName, activeAdapter]);

  async function loadActiveAdapter() {
    try {
      const res = await api.getActiveCrmAdapter();
      if (res.success && res.data) {
        setActiveAdapter(res.data.adapter);
      }
    } catch {
      // fallback to mock
    }
  }

  async function loadContact(id: string) {
    setIsLoading(true);
    try {
      const res = await api.getCrmContact(id);
      if (res.success && res.data) {
        setContact(res.data);
      }
    } catch (err) {
      console.error('Failed to load CRM contact:', err);
    }
    setIsLoading(false);
  }

  async function searchContact() {
    setIsLoading(true);
    try {
      const res = await api.searchCrmContacts({
        email: session.contactEmail || undefined,
        name: session.contactName || undefined,
      });
      if (res.success && res.data && res.data.length > 0) {
        setContact(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to search CRM:', err);
    }
    setIsLoading(false);
  }

  return (
    <div className="w-72 border-l bg-white flex flex-col animate-slide-in-right shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-navy-900">CRM Profile</span>
          <Badge variant={activeAdapter === 'hubspot' ? 'success' : 'default'} className="text-[10px]">
            {activeAdapter === 'hubspot' ? 'HubSpot' : activeAdapter === 'mock' ? 'Local' : activeAdapter}
          </Badge>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full" />
          </div>
        ) : contact ? (
          <div className="space-y-4">
            {/* Contact Card */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-brand-100 mx-auto flex items-center justify-center">
                <User className="w-8 h-8 text-brand-600" />
              </div>
              <h3 className="font-medium text-navy-900 mt-3">
                {contact.firstName} {contact.lastName}
              </h3>
              {contact.title && (
                <p className="text-sm text-gray-500">{contact.title}</p>
              )}
              <Badge variant="info" className="mt-2">{contact.source}</Badge>
            </div>

            {/* Contact Details */}
            <div className="space-y-3 text-sm">
              {contact.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{contact.phone}</span>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span>{contact.company}</span>
                </div>
              )}
            </div>

            {/* HubSpot Deep Link */}
            {activeAdapter === 'hubspot' && contact.externalId && (
              <a
                href={`https://app.hubspot.com/contacts/${contact.externalId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-brand-600 hover:text-brand-700 mt-2"
              >
                <ExternalLink className="w-3 h-3" />
                View in HubSpot
              </a>
            )}

            {/* Custom Fields */}
            {contact.fields && Object.keys(contact.fields).length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Fields</p>
                <div className="space-y-2">
                  {Object.entries(contact.fields).slice(0, 8).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="text-gray-400">{key}: </span>
                      <span className="text-gray-700">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-sm text-gray-500 mt-3">No CRM contact linked</p>
            <p className="text-xs text-gray-400 mt-1">
              {activeAdapter === 'hubspot'
                ? 'Contact will be matched in HubSpot after the call'
                : 'Contact will be matched or created after the call'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
