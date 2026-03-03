import { useDemoStore } from '@/store/demoStore';
import { Badge } from '@/components/ui/Badge';
import { X, User, Building2, Mail, Phone } from 'lucide-react';

interface DemoCrmSidebarProps {
  onClose: () => void;
}

export function DemoCrmSidebar({ onClose }: DemoCrmSidebarProps) {
  const { scenario } = useDemoStore();

  if (!scenario) return null;

  const contact = scenario.contact;

  return (
    <div className="w-72 border-l bg-white flex flex-col animate-slide-in-right shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm font-medium text-navy-900">CRM Profile</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
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
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{contact.email}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{contact.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span>{contact.company}</span>
            </div>
          </div>

          {/* CRM Fields */}
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">CRM Fields</p>
            <div className="space-y-2">
              {Object.entries(contact.fields).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="text-gray-400">{key}: </span>
                  <span className="text-gray-700">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CRM Adapter Badge */}
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Connected CRM</p>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
              <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center">
                <span className="text-xs font-bold text-orange-600">H</span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700">HubSpot CRM</p>
                <p className="text-[10px] text-gray-400">Demo connection</p>
              </div>
              <Badge variant="success" className="ml-auto text-[10px]">Active</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
