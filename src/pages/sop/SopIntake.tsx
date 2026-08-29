import { Navigate } from 'react-router-dom';

/** Kept for old bookmarks; intake now lives inside the unified lead workspace. */
const SopIntake = () => <Navigate to="/sop/pipeline?view=inbox" replace />;

export default SopIntake;
