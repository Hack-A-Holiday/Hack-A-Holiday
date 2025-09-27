import React from 'react';

interface PlanMyAdventureFormProps {
  destination: string;
  travelStartDate: string;
  onDateChange: (date: string) => void;
}

const PlanMyAdventureForm: React.FC<PlanMyAdventureFormProps> = ({
  destination,
  travelStartDate,
  onDateChange,
}) => {
  return (
    <form>
      <h2>Plan My Adventure</h2>
      <div>
        <label htmlFor="destination">Destination</label>
        <input id="destination" type="text" value={destination} readOnly />
      </div>
      <div>
        <label htmlFor="travelStartDate">Travel Start Date</label>
        <input
          id="travelStartDate"
          type="date"
          value={travelStartDate}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>
    </form>
  );
};

export default PlanMyAdventureForm;