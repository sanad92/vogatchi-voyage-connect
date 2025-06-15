
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CompanyInfoSectionProps {
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  onInputChange: (field: string, value: string) => void;
}

const CompanyInfoSection = ({ 
  companyAddress, 
  companyPhone, 
  companyEmail, 
  onInputChange 
}: CompanyInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">معلومات الشركة</h3>
      
      <div>
        <Label htmlFor="companyAddress">عنوان الشركة</Label>
        <Textarea
          id="companyAddress"
          value={companyAddress}
          onChange={(e) => onInputChange('companyAddress', e.target.value)}
          placeholder="العنوان الكامل للشركة"
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="companyPhone">هاتف الشركة</Label>
          <Input
            id="companyPhone"
            value={companyPhone}
            onChange={(e) => onInputChange('companyPhone', e.target.value)}
            placeholder="رقم هاتف الشركة"
          />
        </div>
        
        <div>
          <Label htmlFor="companyEmail">بريد الشركة الإلكتروني</Label>
          <Input
            id="companyEmail"
            type="email"
            value={companyEmail}
            onChange={(e) => onInputChange('companyEmail', e.target.value)}
            placeholder="البريد الإلكتروني للشركة"
          />
        </div>
      </div>
    </div>
  );
};

export default CompanyInfoSection;
