
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { SimpleNavItem } from "./NavigationItems";
import PermissionNavLink from "./PermissionNavLink";

interface NavigationDropdownProps {
  title: string;
  icon: LucideIcon;
  items: SimpleNavItem[];
}

const NavigationDropdown: React.FC<NavigationDropdownProps> = ({ title, icon: Icon, items }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
          <Icon className="h-4 w-4" />
          {title}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {items.map((item) => (
          <DropdownMenuItem key={item.to} asChild>
            <PermissionNavLink item={item} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NavigationDropdown;
