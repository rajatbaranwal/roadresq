// Small request-related display pieces shared by customer and mechanic views
import { MessageCircle, Phone } from 'lucide-react';
import { serviceMeta } from '../../utils/status';
import { Avatar } from '../ui/Misc';
import Button from '../ui/Button';

export const ServiceIcon = ({ serviceType, size = 'md', dark = false }) => {
  const { icon: Icon } = serviceMeta(serviceType);
  const sizes = { sm: 'h-9 w-9 rounded-lg', md: 'h-11 w-11 rounded-xl', lg: 'h-14 w-14 rounded-2xl' };
  return (
    <span
      className={`grid shrink-0 place-items-center ${sizes[size]} ${
        dark ? 'bg-white/10 text-signal-300' : 'bg-signal-50 text-signal-600'
      }`}
    >
      <Icon size={size === 'lg' ? 26 : size === 'sm' ? 18 : 22} aria-hidden />
    </span>
  );
};

export const DetailRow = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3">
    {Icon && <Icon size={16} className="mt-0.5 shrink-0 text-ink-400" aria-hidden />}
    <div className="min-w-0">
      <p className="text-xs font-medium text-ink-400">{label}</p>
      <div className="text-sm text-ink-800">{children}</div>
    </div>
  </div>
);

// Contact card for the other party (mechanic for customers, customer for mechanics)
export const PersonCard = ({ person, role, chatTo, dark = false }) => {
  if (!person) return null;
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-2xl p-3 ${
        dark ? 'border border-white/10 bg-white/5' : 'border border-ink-100 bg-ink-50/60'
      }`}
    >
      <Avatar name={person.name} tone={role === 'Mechanic' ? 'volt' : 'signal'} />
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-medium ${dark ? 'text-ink-300' : 'text-ink-400'}`}>{role}</p>
        <p className={`truncate font-semibold ${dark ? 'text-white' : 'text-ink-900'}`}>{person.name}</p>
        {person.phone && (
          <a href={`tel:${person.phone}`} className={`text-sm ${dark ? 'text-ink-200' : 'text-ink-600'} hover:underline`}>
            {person.phone}
          </a>
        )}
      </div>
      <div className="flex gap-2">
        {person.phone && (
          <Button
            href={`tel:${person.phone}`}
            variant={dark ? 'glass' : 'outline'}
            size="sm"
            icon={Phone}
            aria-label={`Call ${person.name}`}
          >
            <span className="hidden sm:inline">Call</span>
          </Button>
        )}
        {chatTo && (
          <Button to={chatTo} variant={dark ? 'success' : 'dark'} size="sm" icon={MessageCircle}>
            Chat
          </Button>
        )}
      </div>
    </div>
  );
};
