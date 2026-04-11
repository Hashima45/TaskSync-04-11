import React from 'react';
import { LayoutDashboard, ListTodo, Sparkles, Calendar, BarChart3, Settings, LogOut } from 'lucide-react';
import LogoImage from './84909b83-0826-4104-9fe4-ff89c0b804e3-removebg-preview.png';

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onSignOut?: () => void;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab = 'dashboard', onTabChange, onSignOut, onOpenChange, isOpen = true }) => {

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'scheduler', label: 'AI Scheduler', icon: Sparkles },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleTabClick = (tabId: string) => {
    onTabChange?.(tabId);
  };

  const handleSignOut = () => {
    onSignOut?.();
  };

  return (
    <>

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen bg-indigo-50 border-r border-indigo-100 w-64 z-40 
          transition-transform duration-300 lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col overflow-y-auto
        `}
      >
        {/* Logo Section */}
        <div className="border-b border-indigo-100 py-2 pl-0 pr-4">
          <div className="flex items-center gap-0">
            <img src={LogoImage} alt="TaskSync Logo" className="w-25 h-20 -ml-2" />
            <div className="-ml-9">
              <h2 className="font-bold text-3xl text-gray-900 leading-tight">TaskSync</h2>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleTabClick(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                      ${isActive
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-700 hover:bg-white/50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    {isActive && <div className="ml-auto w-2 h-2 bg-indigo-600 rounded-full" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-indigo-100">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-white/50 rounded-lg transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <button
          onClick={() => onOpenChange?.(false)}
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
        />
      )}
    </>
  );
};

export default Sidebar;
