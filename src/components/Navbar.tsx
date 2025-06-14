
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, Calendar, LogOut } from "lucide-react";
import DesktopNavigation from "./navbar/DesktopNavigation";
import MobileNavigation from "./navbar/MobileNavigation";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <nav className="bg-white shadow-lg border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2 text-xl font-bold text-blue-700"
          >
            <Calendar className="h-8 w-8" />
            <span className="hidden sm:block">Vogatchi Tourism</span>
          </Link>

          {/* Desktop Navigation */}
          <DesktopNavigation />

          {/* User Menu & Mobile Toggle */}
          <div className="flex items-center gap-4">
            {/* User Info */}
            {profile && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <span>مرحباً، {profile.full_name}</span>
              </div>
            )}

            {/* Sign Out */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="hidden sm:flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              تسجيل خروج
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <MobileNavigation 
          isOpen={isOpen}
          profile={profile}
          onSignOut={handleSignOut}
          onLinkClick={() => setIsOpen(false)}
        />
      </div>
    </nav>
  );
};

export default Navbar;
