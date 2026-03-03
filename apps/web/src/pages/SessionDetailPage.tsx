import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { formatDuration, formatDateTime } from '@/lib/utils';
import type { CallSession, CallSessionSummary, TemplateSection, CrmContact } from '@qualirec/shared';
import {
  ArrowLeft,
  Clock,
  User,
  FileText,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Edit3,
  Upload,
  Search,
} from 'lucide-react';

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<CallSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState<CallSessionSummary | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [crmMatches, setCrmMatches] = useState<CrmContact[]>([]);
  const [searchingCrm, setSearchingCrm] = useState(false);

  useEffect(() => {
    if (id) loadSession();
  }, [id]);

  async function loadSession() {
    setIsLoading(true);
    try {
      const res = await api.getSession(id!);
      if (res.success && res.data) {
        setSession(res.data);
        if (res.data.summary) {
          setSummaryDraft(res.data.summary as CallSessionSummary);
        }
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    }
    setIsLoading(false);
  }

  async function handleGenerateSummary() {
    setIsGenerating(true);
    try {
      const res = await api.generateSummary(id!);
      if (res.success && res.data) {
        setSummaryDraft(res.data);
        setEditingSummary(true);
        await loadSession();
      }
    } catch (err) {
      console.error('Failed to generate summary:', err);
    }
    setIsGenerating(false);
  }

  async function handleSaveSummary() {
    if (!summaryDraft) return;
    try {
      const edited = { ...summaryDraft, wasEdited: true, editedAt: new Date().toISOString() };
      await api.saveSummary(id!, edited);
      setEditingSummary(false);
      await loadSession();
    } catch (err) {
      console.error('Failed to save summary:', err);
    }
  }

  async function handleSearchCrm() {
    setSearchingCrm(true);
    try {
      const res = await api.searchCrmContacts({
        email: session?.contactEmail || undefined,
        name: session?.contactName || undefined,
      });
      if (res.success && res.data) {
        setCrmMatches(res.data);
      }
    } catch (err) {
      console.error('CRM search failed:', err);
    }
    setSearchingCrm(false);
  }

  async function handleCrmSync(action: 'CREATE' | 'UPDATE', contactId?: string) {
    setIsSyncing(true);
    try {
      // Don't specify adapter — the server will auto-detect HubSpot if configured
      await api.syncToCrm(id!, {
        contactAction: action,
        contactId,
      });
      setShowSyncModal(false);
      await loadSession();
    } catch (err) {
      console.error('CRM sync failed:', err);
    }
    setIsSyncing(false);
  }

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const sections = ((session as Record<string, unknown>).templateSnapshot || session.template?.sections || []) as unknown as TemplateSection[];
  const summary = session.summary as CallSessionSummary | null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/sessions')} className="p-2 rounded-md hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-navy-900">
            {session.contactName || 'Unnamed Session'}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant={session.contactType === 'CANDIDATE' ? 'info' : 'default'}>
              {session.contactType}
            </Badge>
            <Badge variant={session.status === 'SYNCED' ? 'success' : session.status === 'SYNC_FAILED' ? 'danger' : 'warning'}>
              {session.status.replace(/_/g, ' ')}
            </Badge>
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {session.duration ? formatDuration(session.duration) : 'N/A'}
            </span>
            <span className="text-sm text-gray-500">
              {formatDateTime(session.startedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Q&A Responses */}
      <Card>
        <CardHeader>
          <CardTitle>
            <FileText className="w-5 h-5 inline mr-2 text-brand-600" />
            Qualification Responses
          </CardTitle>
        </CardHeader>
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.id}>
              <h4 className="font-medium text-navy-800 mb-3 pb-2 border-b text-sm uppercase tracking-wide">
                {section.title}
              </h4>
              <div className="space-y-3">
                {section.questions.map((q) => {
                  const answer = session.answers?.find((a) => a.questionId === q.id);
                  return (
                    <div key={q.id} className="flex gap-4">
                      <div className="w-2/5">
                        <p className="text-sm text-gray-600">{q.text}</p>
                      </div>
                      <div className="w-3/5">
                        {answer ? (
                          <div>
                            <p className="text-sm font-medium text-navy-900">
                              {answer.responseValue != null ? (
                                Array.isArray(answer.responseValue)
                                  ? (answer.responseValue as string[]).join(', ')
                                  : String(answer.responseValue)
                              ) : (
                                <span className="text-gray-400 italic">
                                  {answer.status === 'SKIPPED' ? 'Skipped' : 'No response'}
                                </span>
                              )}
                            </p>
                            {answer.notes && (
                              <p className="text-xs text-gray-500 mt-1">Note: {answer.notes}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Not answered</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {session.floatingNotes && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-medium text-navy-800 mb-2 text-sm uppercase tracking-wide">
              Additional Notes
            </h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.floatingNotes}</p>
          </div>
        )}
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Sparkles className="w-5 h-5 inline mr-2 text-brand-600" />
            Call Summary
          </CardTitle>
          <div className="flex gap-2">
            {!summary && (
              <Button size="sm" onClick={handleGenerateSummary} loading={isGenerating}>
                <Sparkles className="w-4 h-4 mr-1" />
                Generate Summary
              </Button>
            )}
            {summary && !editingSummary && (
              <Button variant="secondary" size="sm" onClick={() => setEditingSummary(true)}>
                <Edit3 className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>

        {editingSummary && summaryDraft ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Narrative Summary</label>
              <textarea
                value={summaryDraft.narrative}
                onChange={(e) => setSummaryDraft({ ...summaryDraft, narrative: e.target.value })}
                className="input-field mt-1 min-h-[100px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Key Highlights (one per line)</label>
              <textarea
                value={summaryDraft.highlights.join('\n')}
                onChange={(e) =>
                  setSummaryDraft({ ...summaryDraft, highlights: e.target.value.split('\n').filter(Boolean) })
                }
                className="input-field mt-1 min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Next Actions (one per line)</label>
              <textarea
                value={summaryDraft.nextActions.join('\n')}
                onChange={(e) =>
                  setSummaryDraft({ ...summaryDraft, nextActions: e.target.value.split('\n').filter(Boolean) })
                }
                className="input-field mt-1 min-h-[60px]"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveSummary}>Save Summary</Button>
              <Button variant="secondary" size="sm" onClick={() => setEditingSummary(false)}>Cancel</Button>
            </div>
          </div>
        ) : summary ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">{summary.narrative}</p>
            {summary.highlights.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-navy-800 mb-1">Key Highlights</h5>
                <ul className="list-disc list-inside space-y-1">
                  {summary.highlights.map((h, i) => (
                    <li key={i} className="text-sm text-gray-600">{h}</li>
                  ))}
                </ul>
              </div>
            )}
            {summary.nextActions.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-navy-800 mb-1">Next Actions</h5>
                <ul className="list-disc list-inside space-y-1">
                  {summary.nextActions.map((a, i) => (
                    <li key={i} className="text-sm text-gray-600">{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            No summary generated yet. Click "Generate Summary" to create one using AI.
          </p>
        )}
      </Card>

      {/* CRM Sync */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Upload className="w-5 h-5 inline mr-2 text-brand-600" />
            CRM Sync
          </CardTitle>
          {session.crmSyncStatus !== 'COMPLETED' && (
            <Button
              size="sm"
              onClick={() => {
                setShowSyncModal(true);
                handleSearchCrm();
              }}
            >
              <Upload className="w-4 h-4 mr-1" />
              Sync to CRM
            </Button>
          )}
        </CardHeader>

        <div className="flex items-center gap-3">
          {session.crmSyncStatus === 'COMPLETED' ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-700">Successfully synced to CRM</span>
            </>
          ) : session.crmSyncStatus === 'FAILED' ? (
            <>
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-700">Sync failed — click to retry</span>
            </>
          ) : (
            <>
              <Clock className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">Not yet synced</span>
            </>
          )}
        </div>
      </Card>

      {/* CRM Sync Modal */}
      <Modal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        title="Sync to CRM"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Review what will be written to the CRM before committing.
          </p>

          {searchingCrm ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full" />
              Searching CRM for matching contacts...
            </div>
          ) : crmMatches.length > 0 ? (
            <div>
              <p className="text-sm font-medium mb-2">Matching CRM contacts found:</p>
              {crmMatches.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-3 border rounded-md mb-2">
                  <div>
                    <p className="font-medium text-sm">{contact.firstName} {contact.lastName}</p>
                    <p className="text-xs text-gray-500">{contact.email} | {contact.company}</p>
                  </div>
                  <Button size="sm" onClick={() => handleCrmSync('UPDATE', contact.id)} loading={isSyncing}>
                    Update This Contact
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => handleCrmSync('CREATE')}
                loading={isSyncing}
              >
                Create New Contact Instead
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-3">No matching contacts found in CRM.</p>
              <Button onClick={() => handleCrmSync('CREATE')} loading={isSyncing}>
                Create New CRM Contact
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
