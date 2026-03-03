import { useDemoStore } from '@/store/demoStore';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Signal, Phone, Video, Clock } from 'lucide-react';

export function DemoVoipBanner() {
  const { scenario, voipState, callQuality, voipEvents, callTimer } = useDemoStore();

  if (!scenario) return null;

  const isZoom = scenario.voipAdapter === 'zoom';

  const qualityColor = {
    excellent: 'text-green-400',
    good: 'text-yellow-400',
    fair: 'text-red-400',
  }[callQuality];

  const qualityBars = {
    excellent: 4,
    good: 3,
    fair: 2,
  }[callQuality];

  const lastEvent = voipEvents[voipEvents.length - 1];

  return (
    <div className="bg-navy-800/50 border-b border-navy-700 px-6 py-1.5 flex items-center justify-between text-xs">
      {/* Left: VOIP adapter info */}
      <div className="flex items-center gap-3">
        <Badge className="bg-navy-700 text-navy-300 border border-navy-600">
          {isZoom ? (
            <><Video className="w-3 h-3 mr-1" /> Zoom</>
          ) : (
            <><Phone className="w-3 h-3 mr-1" /> Twilio</>
          )}
        </Badge>

        {voipState === 'connected' && (
          <div className="flex items-center gap-1.5">
            {/* Signal bars */}
            <div className="flex items-end gap-px h-3">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={cn(
                    'w-1 rounded-sm transition-colors',
                    bar <= qualityBars ? qualityColor.replace('text-', 'bg-') : 'bg-navy-600',
                  )}
                  style={{ height: `${bar * 25}%` }}
                />
              ))}
            </div>
            <span className={cn('capitalize', qualityColor)}>{callQuality}</span>
          </div>
        )}
      </div>

      {/* Center: Last event */}
      {lastEvent && (
        <span className="text-navy-400 truncate max-w-xs">
          {lastEvent.message}
        </span>
      )}

      {/* Right: Connection status */}
      <div className="flex items-center gap-2">
        {voipState === 'connected' ? (
          <>
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400">Connected</span>
          </>
        ) : voipState === 'ended' ? (
          <>
            <WifiOff className="w-3 h-3 text-gray-500" />
            <span className="text-gray-500">Disconnected</span>
          </>
        ) : (
          <>
            <Wifi className="w-3 h-3 text-yellow-400 animate-pulse" />
            <span className="text-yellow-400">Connecting...</span>
          </>
        )}
      </div>
    </div>
  );
}
