exports.planTrip = async (req, res) => {
  // Dummy implementation
  const { preferences } = req.body;
  res.json({
    message: 'Trip planned!',
    itinerary: {
      destination: preferences.destination || 'Paris, France',
      days: 5,
      activities: ['Sightseeing', 'Museum', 'Food tour']
    }
  });
};
