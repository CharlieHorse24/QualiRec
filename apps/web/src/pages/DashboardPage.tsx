import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { formatDuration, formatRelativeTime } from '@/lib/utils';
import type { DashboardStats, CallSession } from '@qualirec/shared';
import {
  Phone,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<CallSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setIsLoading(true);
    try {
      const [statsRes, sessionsRes] = await Promise.all([
        api.getDashboardStats(),
        api.getSessions({ page: 1 }),
      ]);
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (sessionsRes.success && sessionsRes.data) setRecentSessions(sessionsRes.data.items.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
    setIsLoading(false);
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge variant="info">In Progress</Badge>;
      case 'COMPLETED':
        return <Badge variant="warning">Completed</Badge>;
      case 'SYNCED':
        return <Badge variant="success">Synced</Badge>;
      case 'SYNC_FAILED':
        return <Badge variant="danger">Sync Failed</Badge>;
      case 'PENDING_SYNC':
        return <Badge variant="warning">Pending Sync</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Your qualification call overview</p>
        </div>
        <Button onClick={() => navigate('/call')}>
          <Phone className="w-4 h-4 mr-2" />
          New Call Session
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-50 rounded-lg">
              <Phone className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Calls Today</p>
              <p className="text-2xl font-bold text-navy-900">{stats?.callsToday || 0}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Week</p>
              <p className="text-2xl font-bold text-navy-900">{stats?.callsThisWeek || 0}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Duration</p>
              <p className="text-2xl font-bold text-navy-900">
                {stats?.avgCallDuration ? formatDuration(Math.round(stats.avgCallDuration)) : '0:00'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">CRM Sync Rate</p>
              <p className="text-2xl font-bold text-navy-900">{stats?.crmSyncRate || 0}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Flagged Items */}
      {stats && stats.flaggedItems > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <p className="text-sm font-medium text-amber-800">
              {stats.flaggedItems} session{stats.flaggedItems !== 1 ? 's' : ''} need attention (failed CRM sync or missing fields)
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/sessions?filter=flagged')}
              className="ml-auto text-amber-700"
            >
              View <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Recent Sessions */}
      <Card padding={false}>
        <CardHeader className="px-6 pt-6">
          <CardTitle>Recent Sessions</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/sessions')}>
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Template</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No sessions yet. Start your first call!
                  </td>
                </tr>
              ) : (
                recentSessions.map((session) => (
                  <tr
                    key={session.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/sessions/${session.id}`)}
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
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatRelativeTime(session.startedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
