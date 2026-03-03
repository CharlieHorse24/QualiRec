import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoStore } from '@/store/demoStore';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDuration } from '@/lib/utils';
import {
  ArrowLeft,
  Clock,
  FileText,
  Sparkles,
  Upload,
  CheckCircle,
  RotateCcw,
  Eye,
  ArrowRight,
  Database,
  Loader2,
  User,
  Building2,
  Mail,
  Phone,
} from 'lucide-react';

export function DemoSummaryPage() {
  const navigate = useNavigate();
  const {
    scenario,
    sections,
    answers,
    callTimer,
    floatingNotes,
    summary,
    crmSyncStatus,
    crmSyncProgress,
    fieldMappings,
    generateSummary,
    startCrmSync,
    resetDemo,
    phase,
  } = useDemoStore();

  const [showFieldMappings, setShowFieldMappings] = useState(false);
  const [summaryGenerated, setSummaryGenerated] = useState(false);

  useEffect(() => {
    if (!scenario || phase === 'landing') {
      navigate('/demo');
    }
  }, [scenario, phase, navigate]);

  useEffect(() => {
    // Auto-trigger summary generation when page loads
    if (scenario && !summaryGenerated) {
      setSummaryGenerated(true);
      generateSummary();
    }
  }, [scenario, summaryGenerated, generateSummary]);

  if (!scenario) return null;

  const contact = scenario.contact;
  const answeredCount = Object.values(answers).filter((a) => a.status === 'ANSWERED').length;
  const totalQuestions = sections.flatMap((s) => s.questions).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Banner */}
      <div className="bg-brand-600 text-white px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <Eye className="w-4 h-4" />
          <span className="font-medium">Demo Mode</span>
          <span className="text-brand-200">— Post-Call Review</span>
        </div>
        <button
          onClick={() => {
            resetDemo();
            navigate('/demo');
          }}
          className="text-xs px-2 py-1 rounded bg-brand-700 hover:bg-brand-800 transition-colors flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Restart Demo
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/demo/call')}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-navy-900">
              {contact.firstName} {contact.lastName}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant={scenario.contactType === 'CANDIDATE' ? 'info' : 'default'}>
                {scenario.contactType}
              </Badge>
              <Badge variant="success">COMPLETED</Badge>
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(callTimer)}
              </span>
              <span className="text-sm text-gray-500">
                {answeredCount} of {totalQuestions} questions answered
              </span>
            </div>
          </div>
        </div>

        {/* Contact Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              <User className="w-5 h-5 inline mr-2 text-brand-600" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{contact.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{contact.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{contact.company}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{contact.title}</span>
            </div>
          </div>
        </Card>

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
                    const answer = answers[q.id];
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
                              {answer.status === 'FLAGGED' && (
                                <Badge variant="warning" className="mt-1">Flagged</Badge>
                              )}
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

          {floatingNotes && (
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-medium text-navy-800 mb-2 text-sm uppercase tracking-wide">
                Additional Notes
              </h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{floatingNotes}</p>
            </div>
          )}
        </Card>

        {/* AI Summary */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Sparkles className="w-5 h-5 inline mr-2 text-brand-600" />
              AI-Generated Summary
            </CardTitle>
          </CardHeader>

          {!summary ? (
            <div className="flex items-center gap-3 py-8 justify-center">
              <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
              <span className="text-sm text-gray-500">Generating AI summary from call data...</span>
            </div>
          ) : (
            <div className="space-y-4 animate-slide-in-up">
              <p className="text-sm text-gray-700 leading-relaxed">{summary.narrative}</p>

              {summary.highlights.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-navy-800 mb-2">Key Highlights</h5>
                  <ul className="space-y-1.5">
                    {summary.highlights.map((h, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.nextActions.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-navy-800 mb-2">Recommended Next Actions</h5>
                  <ul className="space-y-1.5">
                    {summary.nextActions.map((a, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* CRM Sync */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Database className="w-5 h-5 inline mr-2 text-brand-600" />
              CRM Sync
            </CardTitle>
            {crmSyncStatus === 'idle' && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowFieldMappings(!showFieldMappings)}
                >
                  {showFieldMappings ? 'Hide' : 'Preview'} Field Mappings
                </Button>
                <Button size="sm" onClick={startCrmSync}>
                  <Upload className="w-4 h-4 mr-1" />
                  Sync to HubSpot
                </Button>
              </div>
            )}
          </CardHeader>

          {/* Field Mappings Preview */}
          {showFieldMappings && crmSyncStatus === 'idle' && (
            <div className="mb-4 border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <p className="text-xs font-medium text-gray-500 uppercase">Field Mapping Preview — data to write</p>
              </div>
              <div className="divide-y">
                {fieldMappings.map((mapping, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-4 text-sm">
                    <span className="text-gray-500 w-1/3 truncate">{mapping.question}</span>
                    <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                    <code className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded font-mono">
                      {mapping.crmField}
                    </code>
                    <span className="ml-auto text-navy-800 font-medium">{mapping.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sync Progress */}
          {crmSyncStatus === 'syncing' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
                <span className="text-sm text-gray-600">Syncing to HubSpot CRM...</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-brand-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${crmSyncProgress}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                {crmSyncProgress >= 10 && <p className="text-gray-600">Authenticating with HubSpot...</p>}
                {crmSyncProgress >= 25 && <p className="text-gray-600">Searching for existing contact...</p>}
                {crmSyncProgress >= 45 && <p className="text-gray-600">Creating/updating contact record...</p>}
                {crmSyncProgress >= 60 && <p className="text-gray-600">Writing field mappings...</p>}
                {crmSyncProgress >= 78 && <p className="text-gray-600">Adding call activity note...</p>}
                {crmSyncProgress >= 90 && <p className="text-gray-600">Attaching summary to contact...</p>}
              </div>
            </div>
          )}

          {/* Sync Success */}
          {crmSyncStatus === 'success' && (
            <div className="animate-slide-in-up">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-800">Successfully synced to HubSpot CRM</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Contact record updated with {fieldMappings.length} fields, call activity logged, and summary attached.
                  </p>
                </div>
              </div>

              {/* Simulated CRM record preview */}
              <div className="mt-4 border rounded-lg overflow-hidden">
                <div className="bg-orange-50 px-4 py-2 border-b flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-orange-100 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-orange-600">H</span>
                  </div>
                  <p className="text-xs font-medium text-orange-700">HubSpot Contact Record</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                      <p className="font-medium text-navy-900">{contact.firstName} {contact.lastName}</p>
                      <p className="text-xs text-gray-500">{contact.title} at {contact.company}</p>
                    </div>
                    <Badge variant="success" className="ml-auto">Synced</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {fieldMappings.slice(0, 4).map((m, i) => (
                      <div key={i} className="bg-gray-50 rounded p-2">
                        <span className="text-gray-400">{m.crmField.replace('contact.', '')}</span>
                        <p className="text-gray-700 font-medium mt-0.5">{m.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-blue-50 rounded p-2 text-xs">
                    <span className="text-blue-500 font-medium">Latest Activity</span>
                    <p className="text-blue-700 mt-0.5">
                      Qualification call completed — {formatDuration(callTimer)} duration, {Object.values(answers).filter(a => a.status === 'ANSWERED').length} questions answered
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Idle state */}
          {crmSyncStatus === 'idle' && !showFieldMappings && (
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">
                Ready to sync. Preview field mappings or push directly to HubSpot.
              </span>
            </div>
          )}
        </Card>

        {/* Demo Complete CTA */}
        {crmSyncStatus === 'success' && (
          <div className="text-center py-8 animate-slide-in-up">
            <h3 className="text-xl font-semibold text-navy-900 mb-2">Demo Complete</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              You've seen the full QualiRec workflow — from incoming call to AI summary to CRM sync.
              Ready to try it with your own data?
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  resetDemo();
                  navigate('/demo');
                }}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Try Another Scenario
              </Button>
              <Button onClick={() => navigate('/login')}>
                Sign In to Get Started
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
