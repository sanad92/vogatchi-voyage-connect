
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface SiteInfoSectionProps {
  siteName: string;
  companyName: string;
  siteDescription: string;
  onInputChange: (field: string, value: string) => void;
}

const SiteInfoSection = ({ 
  siteName, 
  companyName, 
  siteDescription, 
  onInputChange 
}: SiteInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">معلومات الموقع</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="siteName">اسم الموقع</Label>
          <Input
            id="siteName"
            value={siteName}
            onChange={(e) => onInputChange('siteName', e.target.value)}
            placeholder="اسم الموقع"
          />
        </div>
        
        <div>
          <Label htmlFor="companyName">اسم الشركة</Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => onInputChange('companyName', e.target.value)}
            placeholder="اسم الشركة"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="siteDescription">وصف الموقع</Label>
        <Textarea
          id="siteDescription"
          value={siteDescription}
          onChange={(e) => onInputChange('siteDescription', e.target.value)}
          placeholder="وصف مختصر للموقع"
          rows={3}
        />
      </div>
    </div>
  );
};

export default SiteInfoSection;
