
import { mainNavItems, businessNavItems, communicationNavItems } from "./NavigationItems";
import NavLink from "./NavLink";

const DesktopNavigation = () => {
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
    </div>
  );
};

export default DesktopNavigation;
