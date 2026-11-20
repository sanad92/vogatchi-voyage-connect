import { Navigate, useSearchParams } from 'react-router-dom';

const NewHotelBooking = () => {
  const [params] = useSearchParams();
  const query = new URLSearchParams(params);
  query.set('type', 'hotel');
  return <Navigate to={`/bookings/new?${query}`} replace />;
};

export default NewHotelBooking;
