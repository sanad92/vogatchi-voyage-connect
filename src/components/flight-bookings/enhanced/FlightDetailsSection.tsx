
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plane, MapPin, Calendar } from 'lucide-react';

interface FlightDetailsSectionProps {
  departureAirportId: string;
  arrivalAirportId: string;
  airlineId: string;
  flightClassId: string;
  departureDate: string;
  arrivalDate: string;
  numberOfPassengers: number;
  onDepartureAirportChange: (airportId: string) => void;
  onArrivalAirportChange: (airportId: string) => void;
  onAirlineChange: (airlineId: string) => void;
  onFlightClassChange: (classId: string) => void;
  onDepartureDateChange: (date: string) => void;
  onArrivalDateChange: (date: string) => void;
  onPassengersChange: (count: number) => void;
  airports?: Array<{ id: string; name: string; city: string; country: string }>;
  airlines?: Array<{ id: string; name: string }>;
  flightClasses?: Array<{ id: string; name: string; name_ar: string }>;
  errors?: Record<string, string>;
}

const FlightDetailsSection = ({
  departureAirportId,
  arrivalAirportId,
  airlineId,
  flightClassId,
  departureDate,
  arrivalDate,
  numberOfPassengers,
  onDepartureAirportChange,
  onArrivalAirportChange,
  onAirlineChange,
  onFlightClassChange,
  onDepartureDateChange,
  onArrivalDateChange,
  onPassengersChange,
  airports = [],
  airlines = [],
  flightClasses = [],
  errors = {}
}: FlightDetailsSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Plane className="h-5 w-5" />
        تفاصيل الرحلة
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="departure_airport" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            مطار المغادرة
          </Label>
          <Select value={departureAirportId} onValueChange={onDepartureAirportChange}>
            <SelectTrigger>
              <SelectValue placeholder="اختر مطار المغادرة" />
            </SelectTrigger>
            <SelectContent>
              {airports.map((airport) => (
                <SelectItem key={airport.id} value={airport.id}>
                  {airport.name} - {airport.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.departure_airport_id && (
            <p className="text-sm text-red-600 mt-1">{errors.departure_airport_id}</p>
          )}
        </div>

        <div>
          <Label htmlFor="arrival_airport" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            مطار الوصول
          </Label>
          <Select value={arrivalAirportId} onValueChange={onArrivalAirportChange}>
            <SelectTrigger>
              <SelectValue placeholder="اختر مطار الوصول" />
            </SelectTrigger>
            <SelectContent>
              {airports.map((airport) => (
                <SelectItem key={airport.id} value={airport.id}>
                  {airport.name} - {airport.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.arrival_airport_id && (
            <p className="text-sm text-red-600 mt-1">{errors.arrival_airport_id}</p>
          )}
        </div>

        <div>
          <Label htmlFor="airline">شركة الطيران</Label>
          <Select value={airlineId} onValueChange={onAirlineChange}>
            <SelectTrigger>
              <SelectValue placeholder="اختر شركة الطيران" />
            </SelectTrigger>
            <SelectContent>
              {airlines.map((airline) => (
                <SelectItem key={airline.id} value={airline.id}>
                  {airline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Label htmlFor="flight_class">درجة السفر</Label>
          <Select value={flightClassId} onValueChange={onFlightClassChange}>
            <SelectTrigger>
              <SelectValue placeholder="اختر درجة السفر" />
            </SelectTrigger>
            <SelectContent>
              {flightClasses.map((flightClass) => (
                <SelectItem key={flightClass.id} value={flightClass.id}>
                  {flightClass.name_ar || flightClass.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="passengers">عدد المسافرين</Label>
          <Input
            type="number"
            id="passengers"
            value={numberOfPassengers}
            onChange={(e) => onPassengersChange(Number(e.target.value))}
            min="1"
            required
          />
        </div>
      </div>
    </div>
  );
};

export default FlightDetailsSection;
