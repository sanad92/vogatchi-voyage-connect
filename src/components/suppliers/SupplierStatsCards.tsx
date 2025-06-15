
import { Card, CardContent } from '@/components/ui/card';
import { Building, Star, DollarSign, Users } from 'lucide-react';

interface SupplierStatsCardsProps {
  totalSuppliers: number;
  activeSuppliers: number;
  avgRating: number;
}

const SupplierStatsCards = ({ totalSuppliers, activeSuppliers, avgRating }: SupplierStatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">إجمالي الموردين</p>
              <p className="text-2xl font-bold">{totalSuppliers}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">الموردين النشطين</p>
              <p className="text-2xl font-bold">{activeSuppliers}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600">متوسط التقييم</p>
              <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">العملة الأساسية</p>
              <p className="text-2xl font-bold">EGP</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierStatsCards;
