import React from 'react';

interface DestinationSelectorProps {
  onSelect: (destination: string) => void;
}

const DestinationSelector: React.FC<DestinationSelectorProps> = ({ onSelect }) => {
  const destinations = ['Paris', 'New York', 'Tokyo', 'Sydney'];

  return (
    <div>
      <h2>Select a Destination</h2>
      <ul>
        {destinations.map((destination) => (
          <li key={destination}>
            <button onClick={() => onSelect(destination)}>{destination}</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DestinationSelector;