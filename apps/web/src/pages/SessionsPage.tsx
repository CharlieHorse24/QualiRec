import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';
import { formatDuration, formatDateTime } from '@/lib/utils';
import type { CallSession, PaginatedResponse } from '@qualirec/shared';
import { Search, Phone, RefreshCw } from 'lucide-react';

export function SessionsPage() {
  const [sessions, setSessions] = useState<PaginatedResponse<CallSession> | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSessions();
  }, [page, statusFilter, typeFilter]);

  async function loadSessions() {
    setIsLoading(true);
    try {
      const res = await api.getSessions({
        page,
        status: statusFilter || undefined,
        contactType: typeFilter || undefined,
        search: search || undefined,
      });
      if (res.success && res.data) setSessions(res.data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
    setIsLoading(false);
  }

  function handleSearch() {
    setPage(1);
    loadSessions();
  }

  const statusBadge = (status: string) => {
    const map: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'default'> = {
      IN_PROGRESS: 'info',
      COMPLETED: 'warning',
      PENDING_SYNC: 'warning',
      SYNCED: 'success',
      SYNC_FAILED: 'danger',
    };
    return <Badge variant={map[status] || 'default'}>{status.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Sessions</h1>
          <p className="text-gray-500 mt-1">View and manage your qualification call sessions</p>
        </div>
        <Button onClick={() => navigate('/call')}>
          <Phone className="w-4 h-4 mr-2" />
          New Call
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by contact name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Select
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'SYNCED', label: 'Synced' },
              { value: 'SYNC_FAILED', label: 'Sync Failed' },
            ]}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          />
          <Select
            options={[
              { value: '', label: 'All Types' },
              { value: 'CANDIDATE', label: 'Candidate' },
              { value: 'CLIENT', label: 'Client' },
            ]}
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          />
          <Button variant="secondary" onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Sessions Table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Template</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">CRM Sync</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions?.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      No sessions found
                    </td>
                  </tr>
                ) : (
                  sessions?.items.map((session) => (
                    <tr
                      key={session.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        if (session.status === 'IN_PROGRESS') {
                          navigate(`/call/${session.id}`);
                        } else {
                          navigate(`/sessions/${session.id}`);
                        }
                      }}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-navy-900">
                        {session.contactName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={session.contactType === 'CANDIDATE' ? 'info' : 'default'}>
                          {session.contactType}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {(session.template as Record<string, string>)?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {session.duration ? formatDuration(session.duration) : '--:--'}
                      </td>
                      <td className="px-6 py-4">{statusBadge(session.status)}</td>
                      <td className="px-6 py-4">{statusBadge(session.crmSyncStatus)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDateTime(session.startedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {sessions && sessions.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t">
                <p className="text-sm text-gray-500">
                  Page {sessions.page} of {sessions.totalPages} ({sessions.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= sessions.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
