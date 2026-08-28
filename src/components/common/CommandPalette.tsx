import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  ERP_MODULES,
  HOME_SCREENS,
  QUICK_ACTIONS,
  SYSTEM_SCREENS,
  getModuleScreens,
  type NavigationScreen,
} from '@/config/moduleNavigation';
import { useNavigationAccess } from '@/hooks/useNavigationAccess';

interface PaletteGroup {
  label: string;
  items: NavigationScreen[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CommandPalette = ({ open, onOpenChange }: CommandPaletteProps) => {
  const navigate = useNavigate();
  const { canAccessScreen } = useNavigationAccess();

  const groups = useMemo(() => {
    const output: PaletteGroup[] = [];
    const usedHrefs = new Set<string>();
    const addGroup = (label: string, items: NavigationScreen[]) => {
      const unique = items.filter((item) => {
        if (!canAccessScreen(item) || usedHrefs.has(item.href)) return false;
        usedHrefs.add(item.href);
        return true;
      });
      if (unique.length > 0) output.push({ label, items: unique });
    };

    addGroup('إنشاء سريع', QUICK_ACTIONS);
    addGroup('الرئيسية', HOME_SCREENS);

    ERP_MODULES.forEach((module) => {
      const screens = getModuleScreens(module).filter(canAccessScreen);
      if (screens.length === 0) return;
      addGroup(module.label, [
        {
          title: `نظرة عامة — ${module.label}`,
          href: module.overviewHref,
          icon: module.icon,
          description: module.description,
          isOverview: true,
        },
        ...screens,
      ]);
    });

    addGroup('إدارة النظام', SYSTEM_SCREENS);
    return output;
  }, [canAccessScreen]);

  const go = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="ابحث عن صفحة أو إجراء…" />
      <CommandList className="max-h-[70vh]">
        <CommandEmpty>لا توجد نتائج.</CommandEmpty>
        {groups.map((group, idx) => (
          <div key={group.label}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group.label}>
              {group.items.map((it) => {
                const Icon = it.icon;
                return (
                  <CommandItem
                    key={it.href}
                    value={`${it.title} ${it.keywords || ''} ${it.description} ${it.href}`}
                    onSelect={() => go(it.href)}
                    className="gap-2.5 py-2"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">{it.title}</span>
                    <span className="hidden max-w-52 truncate text-[10px] text-muted-foreground/70 sm:block">{it.description}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
