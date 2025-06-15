
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, MapPin, Calendar, Clock, Users } from 'lucide-react';

interface TransportTripDetailsSectionProps {
  routeId: string;
  vehicleTypeId: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  numberOfPassengers: number;
  onRouteChange: (routeId: string) => void;
  onVehicleTypeChange: (typeId: string) => void;
  onDepartureDateChange: (date: string) => void;
  onDepartureTimeChange: (time: string) => void;
  onArrivalDateChange: (date: string) => void;
  onArrivalTimeChange: (time: string) => void;
  onPickupLocationChange: (location: string) => void;
  onDropoffLocationChange: (location: string) => void;
  onPassengersChange: (count: number) => void;
  routes?: Array<{ id: string; route_name: string; departure_city: string; arrival_city: string }>;
  vehicleTypes?: Array<{ id: string; name: string; capacity_passengers: number }>;
  errors?: Record<string, string>;
}

const TransportTripDetailsSection = ({
  routeId,
  vehicleTypeId,
  departureDate,
  departureTime,
  arrivalDate,
  arrivalTime,
  pickupLocation,
  dropoffLocation,
  numberOfPassengers,
  onRouteChange,
  onVehicleTypeChange,
  onDepartureDateChange,
  onDepartureTimeChange,
  onArrivalDateChange,
  onArrivalTimeChange,
  onPickupLocationChange,
  onDropoffLocationChange,
  onPassengersChange,
  routes = [],
  vehicleTypes = [],
  errors = {}
}: TransportTripDetailsSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Truck className="h-5 w-5" />
        تفاصيل الرحلة
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="route">الطريق</Label>
          <Select value={routeId} onValueChange={onRouteChange}>
            <SelectTrigger>
              <SelectValue placeholder="اختر طريق" />
            </SelectTrigger>
            <SelectContent>
              {routes.map((route) => (
                <SelectItem key={route.id} value={route.id}>
                  {route.route_name} ({route.departure_city} - {route.arrival_city})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="vehicle_type">نوع المركبة</Label>
          <Select value={vehicleTypeId} onValueChange={onVehicleTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="اختر نوع المركبة" />
            </SelectTrigger>
            <SelectContent>
              {vehicleTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name} - {type.capacity_passengers} راكب
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="passengers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            عدد الركاب
          </Label>
          <Input
            type="number"
            id="passengers"
            value={numberOfPassengers}
            onChange={(e) => onPassengersChange(Number(e.target.value))}
            min="1"
            required
          />
        </div>

        <div>
          <Label htmlFor="departure_date" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            تاريخ المغادرة
          </Label>
          <Input
            type="date"
            id="departure_date"
            value={departureDate}
            onChange={(e) => onDepartureDateChange(e.target.value)}
            required
          />
          {errors.departure_date && (
            <p className="text-sm text-red-600 mt-1">{errors.departure_date}</p>
          )}
        </div>

        <div>
          <Label htmlFor="departure_time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            وقت المغادرة
          </Label>
          <Input
            type="time"
            id="departure_time"
            value={departureTime}
            onChange={(e) => onDepartureTimeChange(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="arrival_date" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            تاريخ الوصول
          </Label>
          <Input
            type="date"
            id="arrival_date"
            value={arrivalDate}
            onChange={(e) => onArrivalDateChange(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="arrival_time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            وقت الوصول
          </Label>
          <Input
            type="time"
            id="arrival_time"
            value={arrivalTime}
            onChange={(e) => onArrivalTimeChange(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="pickup_location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            مكان الاستلام
          </Label>
          <Input
            type="text"
            id="pickup_location"
            value={pickupLocation}
            onChange={(e) => onPickupLocationChange(e.target.value)}
            placeholder="مكان الاستلام"
            required
          />
          {errors.pickup_location && (
            <p className="text-sm text-red-600 mt-1">{errors.pickup_location}</p>
          )}
        </div>

        <div>
          <Label htmlFor="dropoff_location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            مكان التسليم
          </Label>
          <Input
            type="text"
            id="dropoff_location"
            value={dropoffLocation}
            onChange={(e) => onDropoffLocationChange(e.target.value)}
            placeholder="مكان التسليم"
            required
          />
          {errors.dropoff_location && (
            <p className="text-sm text-red-600 mt-1">{errors.dropoff_location}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransportTripDetailsSection;
