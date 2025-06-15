
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { NavigationItem } from './NavigationItems';

interface NavigationDropdownProps {
  title: string;
  icon: LucideIcon;
  items: NavigationItem[];
}

const NavigationDropdown = ({ title, icon: Icon, items }: NavigationDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActiveGroup = items.some(item => 
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  );

  return (
    <div className="relative group">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setTimeout(() => setIsOpen(false), 100)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-md ${
          isActiveGroup 
            ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 shadow-md' 
            : 'text-gray-700 hover:text-blue-700'
        }`}
      >
        <Icon className="h-4 w-4" />
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in slide-in-from-top-2"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
            {title}
          </div>
          {items.map((item) => {
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:translate-x-1 ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-r-2 border-blue-500' 
                    : 'text-gray-700 hover:text-blue-700'
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NavigationDropdown;
