import { useEffect, useState } from 'react';
import { useDemoStore } from '@/store/demoStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Phone, PhoneOff, Video, User, Wifi } from 'lucide-react';

export function DemoVoipRinging() {
  const { scenario, voipState, answerIncomingCall, resetDemo } = useDemoStore();
  const [ringPulse, setRingPulse] = useState(0);

  useEffect(() => {
    if (voipState !== 'ringing') return;
    const interval = setInterval(() => {
      setRingPulse((p) => (p + 1) % 3);
    }, 800);
    return () => clearInterval(interval);
  }, [voipState]);

  if (!scenario) return null;

  const isZoom = scenario.voipAdapter === 'zoom';

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        {/* Ringing animation */}
        {voipState === 'ringing' && (
          <>
            {/* Concentric pulse rings */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full bg-brand-500/5 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-2 rounded-full bg-brand-500/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
              <div className="absolute inset-4 rounded-full bg-brand-500/15 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.6s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-brand-600 flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>

            {/* Caller info */}
            <div className="mb-2">
              <Badge className="bg-navy-800 text-navy-300 border border-navy-700 mb-3">
                {isZoom ? (
                  <><Video className="w-3 h-3 mr-1" /> Zoom Meeting</>
                ) : (
                  <><Wifi className="w-3 h-3 mr-1" /> Twilio Voice</>
                )}
              </Badge>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {scenario.contact.firstName} {scenario.contact.lastName}
            </h2>
            <p className="text-navy-400 mb-1">{scenario.contact.title}</p>
            <p className="text-navy-500 text-sm mb-8">{scenario.callerNumber}</p>

            <p className="text-brand-400 text-sm mb-8 animate-pulse">
              Incoming {isZoom ? 'meeting' : 'call'}...
            </p>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={resetDemo}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
                title="Decline"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
              <button
                onClick={answerIncomingCall}
                className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-colors animate-bounce"
                style={{ animationDuration: '1.5s' }}
                title="Answer"
              >
                <Phone className="w-7 h-7 text-white" />
              </button>
            </div>
          </>
        )}

        {/* Connecting state */}
        {voipState === 'connecting' && (
          <>
            <div className="w-20 h-20 rounded-full bg-brand-600 flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Connecting...</h2>
            <p className="text-navy-400 text-sm">
              Establishing secure connection with {scenario.contact.firstName}
            </p>
            <div className="mt-6">
              <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full mx-auto" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
