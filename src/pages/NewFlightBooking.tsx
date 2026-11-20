import { Navigate, useSearchParams } from 'react-router-dom';

const NewFlightBooking = () => {
  const [params] = useSearchParams();
  const query = new URLSearchParams(params);
  query.set('type', 'flight');
  return <Navigate to={`/bookings/new?${query}`} replace />;
};

export default NewFlightBooking;
