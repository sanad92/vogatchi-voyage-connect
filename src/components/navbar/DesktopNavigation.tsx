
import { mainNavItems, businessNavItems, communicationNavItems, adminNavItems } from "./NavigationItems";
import NavLink from "./NavLink";
import { useAuth } from "@/hooks/useAuth";

const DesktopNavigation = () => {
  const { isSuperAdmin, userRole } = useAuth();

  return (
    <div className="hidden lg:flex items-center gap-6">
      {/* Main Actions */}
      <div className="flex items-center gap-1">
        {mainNavItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-300"></div>

      {/* Business Actions */}
      <div className="flex items-center gap-1">
        {businessNavItems.slice(0, 3).map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      {/* Communication */}
      <div className="flex items-center gap-1">
        <NavLink item={communicationNavItems[0]} />
      </div>

      {/* Admin Settings - For Super Admin or temporary development access */}
      {(isSuperAdmin() || process.env.NODE_ENV === 'development') && (
        <>
          <div className="h-6 w-px bg-gray-300"></div>
          <div className="flex items-center gap-1">
            {adminNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
            {!isSuperAdmin() && process.env.NODE_ENV === 'development' && (
              <span className="text-xs text-orange-500 ml-2">
                (تطوير - دورك: {userRole})
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DesktopNavigation;
