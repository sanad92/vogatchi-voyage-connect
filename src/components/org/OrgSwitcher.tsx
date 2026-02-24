
import { useOrganization } from '@/contexts/OrganizationContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

const OrgSwitcher = () => {
  const { currentOrganization, organizations, switchOrganization } = useOrganization();

  if (!currentOrganization || organizations.length <= 1) {
    return currentOrganization ? (
      <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/50 text-sm">
        <Building2 className="h-4 w-4 text-primary" />
        <span className="font-medium truncate max-w-[120px]">{currentOrganization.name}</span>
      </div>
    ) : null;
  }

  return (
    <Select value={currentOrganization.id} onValueChange={switchOrganization}>
      <SelectTrigger className="w-[160px] h-8 text-xs">
        <Building2 className="h-3.5 w-3.5 mr-1 text-primary" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {organizations.map(org => (
          <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default OrgSwitcher;
