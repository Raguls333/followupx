import { motion } from 'framer-motion';
import { LayoutDashboard, Users, CheckSquare, UsersRound, BarChart3, Settings, Zap, FileText } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileBottomNav = ({ activeTab, setActiveTab }: MobileNavProps) => {
  const menuItems = [
    { id: 'today', icon: CheckSquare, label: 'Today' },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
    { id: 'leads', icon: Users, label: 'Leads' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'recovery', icon: Zap, label: 'AI' },
    { id: 'templates', icon: FileText, label: 'Tmpl' },
    { id: 'analytics', icon: BarChart3, label: 'Stats' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 lg:hidden">
      <div className="flex items-center justify-around">
        {menuItems.map(item => (
          <motion.button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="flex-1 py-3 flex flex-col items-center justify-center gap-1 relative"
            whileTap={{ scale: 0.95 }}
          >
            {/* Background indicator */}
            {activeTab === item.id && (
              <motion.div
                layoutId="mobile-nav-indicator"
                className="absolute inset-0 bg-blue-50"
                initial={false}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              />
            )}

            {/* Icon and label */}
            <div className="relative z-10 flex flex-col items-center gap-0.5">
              <item.icon 
                size={22} 
                className={activeTab === item.id ? 'text-blue-600' : 'text-slate-600'}
              />
              <span className={`text-xs font-bold ${
                activeTab === item.id ? 'text-blue-600' : 'text-slate-600'
              }`}>
                {item.label}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
