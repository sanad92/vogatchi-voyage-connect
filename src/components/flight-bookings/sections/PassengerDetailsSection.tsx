
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface PassengerDetailsSectionProps {
  passengerDetails: any[];
  addPassengerDetail: () => void;
  removePassengerDetail: (index: number) => void;
  updatePassengerDetail: (index: number, field: string, value: string) => void;
  numberOfPassengers: number;
}

const PassengerDetailsSection = ({
  passengerDetails,
  addPassengerDetail,
  removePassengerDetail,
  updatePassengerDetail,
  numberOfPassengers,
}: PassengerDetailsSectionProps) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <span className="flex items-center gap-2 font-semibold">
        تفاصيل المسافرين ({numberOfPassengers} مسافر)
      </span>
      <Button type="button" onClick={addPassengerDetail} variant="outline" size="sm">
        إضافة تفاصيل مسافر
      </Button>
    </div>
    {passengerDetails.length === 0 ? (
      <p className="text-gray-500 text-center py-4">
        لم يتم إضافة تفاصيل المسافرين بعد (اختياري)
      </p>
    ) : (
      <div className="space-y-4">
        {passengerDetails.map((passenger, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">المسافر {index + 1}</h4>
              <Button 
                type="button" 
                variant="destructive" 
                size="sm"
                onClick={() => removePassengerDetail(index)}
              >
                حذف
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>الاسم (كما في جواز السفر)</Label>
                <Input
                  value={passenger.name}
                  onChange={(e) => updatePassengerDetail(index, 'name', e.target.value)}
                  placeholder="الاسم الكامل"
                />
              </div>
              <div>
                <Label>رقم جواز السفر</Label>
                <Input
                  value={passenger.passport}
                  onChange={(e) => updatePassengerDetail(index, 'passport', e.target.value)}
                  placeholder="رقم جواز السفر"
                />
              </div>
              <div>
                <Label>تاريخ الميلاد</Label>
                <Input
                  type="date"
                  value={passenger.date_of_birth}
                  onChange={(e) => updatePassengerDetail(index, 'date_of_birth', e.target.value)}
                />
              </div>
              <div>
                <Label>الجنسية</Label>
                <Input
                  value={passenger.nationality}
                  onChange={(e) => updatePassengerDetail(index, 'nationality', e.target.value)}
                  placeholder="الجنسية"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default PassengerDetailsSection;
