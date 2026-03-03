import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Play } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    await login(email, password);
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.svg" alt="QualiRec" className="h-16 w-auto" />
          <p className="text-navy-400 mt-3">Recruiter Qualification Platform</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
            />

            <Input
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            <Button type="submit" loading={isLoading} className="w-full">
              Sign In
            </Button>
          </form>

          {/* Interactive Demo CTA */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-gray-400">or</span>
              </div>
            </div>
            <Link
              to="/demo"
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border-2 border-brand-200 bg-brand-50 text-brand-700 text-sm font-medium hover:bg-brand-100 hover:border-brand-300 transition-all"
            >
              <Play className="w-4 h-4" />
              Try Interactive Demo
            </Link>
            <p className="text-center text-[11px] text-gray-400 mt-2">
              No sign-up required — see the full workflow in action
            </p>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <p className="text-xs text-gray-500 mb-2">Demo accounts:</p>
            <p className="text-xs text-gray-600">
              <strong>Admin:</strong> admin@qualirec.com / admin123
            </p>
            <p className="text-xs text-gray-600">
              <strong>Recruiter:</strong> recruiter@qualirec.com / recruiter123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
