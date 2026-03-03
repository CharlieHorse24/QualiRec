import { useNavigate } from 'react-router-dom';
import { useDemoStore } from '@/store/demoStore';
import { DEMO_SCENARIOS } from '@/demo/demoData';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Phone,
  Video,
  Users,
  UserCheck,
  ArrowRight,
  Monitor,
  Database,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

export function DemoLandingPage() {
  const navigate = useNavigate();
  const { selectScenario } = useDemoStore();

  const handleSelectScenario = (scenarioId: string) => {
    selectScenario(scenarioId);
    navigate('/demo/call');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-navy-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="QualiRec" className="h-10 w-auto" />
            <Badge className="bg-brand-600/20 text-brand-400 border border-brand-600/30">
              Interactive Demo
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="text-navy-400 hover:text-white hover:bg-navy-800">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Login
          </Button>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            See QualiRec in Action
          </h1>
          <p className="text-lg text-navy-400 max-w-2xl mx-auto">
            Experience the full recruiter qualification workflow — from incoming call
            to AI-powered summary to CRM sync — all without connecting any external services.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-6 mb-16">
          <div className="bg-navy-900/50 border border-navy-800 rounded-lg p-5">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
              <Phone className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="font-semibold mb-1">Simulated VOIP</h3>
            <p className="text-sm text-navy-400">
              Incoming call notifications, live timer, call quality indicators, and adapter status — just like a real integration.
            </p>
          </div>
          <div className="bg-navy-900/50 border border-navy-800 rounded-lg p-5">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-brand-400" />
            </div>
            <h3 className="font-semibold mb-1">AI Summary</h3>
            <p className="text-sm text-navy-400">
              See how QualiRec generates narrative summaries, highlights, and next actions from your call data.
            </p>
          </div>
          <div className="bg-navy-900/50 border border-navy-800 rounded-lg p-5">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
              <Database className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-semibold mb-1">CRM Sync</h3>
            <p className="text-sm text-navy-400">
              Watch field mappings populate and data sync to your CRM in real time — works with HubSpot, Salesforce, and Bullhorn.
            </p>
          </div>
        </div>

        {/* Scenario Selection */}
        <h2 className="text-xl font-semibold mb-6 text-center">Choose a Demo Scenario</h2>

        <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
          {DEMO_SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => handleSelectScenario(scenario.id)}
              className="bg-navy-900/50 border border-navy-800 rounded-xl p-6 text-left hover:border-brand-500/50 hover:bg-navy-900 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-600/10 flex items-center justify-center shrink-0 group-hover:bg-brand-600/20 transition-colors">
                  {scenario.contactType === 'CANDIDATE' ? (
                    <UserCheck className="w-6 h-6 text-brand-400" />
                  ) : (
                    <Users className="w-6 h-6 text-brand-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{scenario.title}</h3>
                  </div>
                  <p className="text-sm text-navy-400 mb-4">{scenario.description}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <Badge className="bg-navy-800 text-navy-300">
                      {scenario.contactType === 'CANDIDATE' ? (
                        <><Phone className="w-3 h-3 mr-1" /> {scenario.voipDisplayName}</>
                      ) : (
                        <><Video className="w-3 h-3 mr-1" /> {scenario.voipDisplayName}</>
                      )}
                    </Badge>
                    <Badge className="bg-navy-800 text-navy-300">
                      <Monitor className="w-3 h-3 mr-1" />
                      {scenario.template.sections.flatMap((s) => s.questions).length} questions
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end text-brand-400 text-sm font-medium group-hover:text-brand-300">
                Start Demo
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-navy-600 mt-12">
          No sign-up required. No data leaves your browser. This demo runs entirely client-side.
        </p>
      </div>
    </div>
  );
}
