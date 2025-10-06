import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';
import DestinationSelector from '@/components/DestinationSelector';
import PlanMyAdventureForm from '@/components/PlanMyAdventureForm';

function GlobalPage() {
  const { state } = useAuth();
  const [destination, setDestination] = useState('');
  const [travelStartDate, setTravelStartDate] = useState('');
  const [showPlanForm, setShowPlanForm] = useState(false);

  useEffect(() => {
    if (state.user && !state.user.preferences) {
      Swal.fire({
        title: 'Complete Your Profile Preferences',
        text: 'Please complete your profile preferences to plan your adventure.',
        icon: 'info',
        confirmButtonText: 'Go to Profile',
      }).then(() => {
        window.location.href = '/profile';
      });
    }
  }, [state.user]);

  const handleDestinationSelect = (selectedDestination: string) => {
    setDestination(selectedDestination);

    const userPreferences = state.user?.preferences;

    if (userPreferences) {
      Swal.fire({
        title: 'Use Saved Preferences?',
        text: 'Do you want to use your saved preferences for planning this trip?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
      }).then((result) => {
        if (result.isConfirmed) {
          alert('Trip planned with saved preferences!');
        } else {
          setShowPlanForm(true);
        }
      });
    } else {
      setShowPlanForm(true);
    }
  };

  return (
    <div>
      <h1>Choose Your Destination</h1>
      <DestinationSelector onSelect={handleDestinationSelect} />
      {showPlanForm && (
        <PlanMyAdventureForm
          destination={destination}
          travelStartDate={travelStartDate}
          onDateChange={(date: string) => setTravelStartDate(date)}
        />
      )}
    </div>
  );
}

export default GlobalPage;