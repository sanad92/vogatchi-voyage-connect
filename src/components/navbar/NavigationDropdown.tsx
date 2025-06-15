
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { SimpleNavItem } from './NavigationItems';

interface NavigationDropdownProps {
  title: string;
  icon: any;
  items: SimpleNavItem[];
}

const NavigationDropdown = ({ title, icon: Icon, items }: NavigationDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActiveGroup = items.some(item => 
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActiveGroup 
            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm' 
            : 'text-gray-700 hover:bg-gray-50 hover:text-blue-700'
        }`}
      >
        <Icon className="h-4 w-4" />
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-in slide-in-from-top-2">
          {items.map((item) => {
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-2 text-sm transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-r-2 border-blue-500' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-blue-700'
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NavigationDropdown;
