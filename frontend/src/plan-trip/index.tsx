import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Head from 'next/head';
import Swal from 'sweetalert2';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import Navbar from '../components/layout/Navbar';
import { TravelPreferences, defaultTravelPreferences, PreferencesUtils } from '../types/preferences';
import { GlobeSection, TripForm, PreferencesModal, DestinationCard } from './components';
import { useTripPlanner } from './hooks/useTripPlanner';
import { useGlobeRoute } from './hooks/useGlobeRoute';
import { TripPreferences } from './types';
import { format } from 'date-fns';

export default function PlanTrip() {
	const { state } = useAuth();
	const { isDarkMode } = useDarkMode();
	const [isMobile, setIsMobile] = useState(false);
	const [isTablet, setIsTablet] = useState(false);

	useEffect(() => {
		const checkScreenSize = () => {
			setIsMobile(window.innerWidth <= 640);
			setIsTablet(window.innerWidth <= 1024 && window.innerWidth > 640);
		};
		checkScreenSize();
		window.addEventListener('resize', checkScreenSize);
		return () => window.removeEventListener('resize', checkScreenSize);
	}, []);

	// Initialize travel preferences from user data or defaults
	const [userTravelPreferences, setUserTravelPreferences] = useState<TravelPreferences>(() => {
		const userPrefs = state.user?.preferences as any;
		if (userPrefs) {
			return PreferencesUtils.mergePreferences(defaultTravelPreferences, {
				budget: userPrefs.budget || defaultTravelPreferences.budget,
				travelers: userPrefs.travelers || defaultTravelPreferences.travelers,
				travelStyle: userPrefs.travelStyle || defaultTravelPreferences.travelStyle,
				interests: userPrefs.interests || defaultTravelPreferences.interests,
				favoriteDestinations: userPrefs.favouriteDestinations || userPrefs.favoriteDestinations || defaultTravelPreferences.favoriteDestinations,
				numberOfKids: userPrefs.numberOfKids || defaultTravelPreferences.numberOfKids,
				accommodationType: userPrefs.accommodationType || defaultTravelPreferences.accommodationType,
				activityLevel: userPrefs.activityLevel || defaultTravelPreferences.activityLevel,
				flightPreferences: {
					...defaultTravelPreferences.flightPreferences,
					...(userPrefs.flightPreferences || {})
				}
			});
		}
		return defaultTravelPreferences;
	});

	const [preferences, setPreferences] = useState<TripPreferences>({
		destination: '',
		destinationData: undefined,
		budget: userTravelPreferences.budget,
		duration: 5,
		interests: userTravelPreferences.interests,
		startDate: '2024-06-01',
		travelers: userTravelPreferences.travelers,
		travelStyle: userTravelPreferences.travelStyle,
	});

	const [showPreferencesForm, setShowPreferencesForm] = useState(false);
	const [editablePreferences, setEditablePreferences] = useState<TravelPreferences>(userTravelPreferences);
	const [globeSearchQuery, setGlobeSearchQuery] = useState('');

	// Use custom hooks
	const {
		loading,
		result,
		error,
		planTrip
	} = useTripPlanner({
		userToken: state.token,
		userId: state.user?.id,
		userEmail: state.user?.email,
		userName: state.user?.name,
		userPreferences: state.user?.preferences
	});

	const {
		sourceDestination,
		destinationLocation,
		routeData,
		loadingRoute,
		clickStep,
		typedSource,
		typedDestination,
		setTypedSource,
		setTypedDestination,
		setSourceDestination,
		setDestinationLocation,
		setRouteData,
		setClickStep,
		fetchRouteCoordinates,
		handleResetSelection,
		swapSourceDestination
	} = useGlobeRoute();

	// Wrap handleDestinationSelect to match the component's expectations
	const onGlobeDestinationSelect = (destination: any) => {
		if (clickStep === 'source') {
			// First click - set as source
			setSourceDestination(destination);
			setTypedSource(`${destination.name}, ${destination.country}`);
			setClickStep('destination');
		} else {
			// Second click - set as destination and fetch route
			setDestinationLocation(destination);
			setTypedDestination(`${destination.name}, ${destination.country}`);
			setPreferences(prev => ({
				...prev,
				destination: `${destination.name}, ${destination.country}`,
				destinationData: destination
			}));
			
			// Automatically fetch route with both locations
			const source = sourceDestination?.name || typedSource.trim();
			if (source) {
				fetchRouteCoordinates(source, destination.name);
			}
		}
	};

	// Helper functions for responsive styling
	const getContainerPadding = () => {
		if (isMobile) return '20px 15px';
		if (isTablet) return '30px 20px';
		return '40px 20px';
	};

	const getTitleFontSize = () => {
		if (isMobile) return '2.2rem';
		if (isTablet) return '2.6rem';
		return '3rem';
	};

	// Source and destination change handlers
	const handleSourceChange = (value: string) => {
		setTypedSource(value);
		// Clear globe selection if user is typing
		if (sourceDestination) {
			setSourceDestination(null);
		}
		// Clear route when editing
		if (routeData) {
			setRouteData(null);
		}
	};

	const handleDestinationChange = (value: string) => {
		setTypedDestination(value);
		setPreferences(prev => ({ ...prev, destination: value }));
		// Clear globe selection if user is typing
		if (destinationLocation) {
			setDestinationLocation(null);
		}
		// Clear route when editing
		if (routeData) {
			setRouteData(null);
		}
	};

	const handleSwapLocations = () => {
		// Swap source and destination
		const tempTypedSource = typedSource;
		const tempTypedDestination = typedDestination;
		const tempSourceDest = sourceDestination;
		const tempDestLocation = destinationLocation;
		
		setTypedSource(tempTypedDestination);
		setTypedDestination(tempTypedSource);
		setSourceDestination(tempDestLocation);
		setDestinationLocation(tempSourceDest);
		
		// Clear route to refresh
		if (routeData) {
			setRouteData(null);
			// Re-fetch route with swapped locations if both are set
			setTimeout(() => {
				const newSource = tempDestLocation?.name || tempTypedDestination.trim();
				const newDest = tempSourceDest?.name || tempTypedSource.trim();
				if (newSource && newDest) {
					fetchRouteCoordinates(newSource, newDest);
				}
			}, 100);
		}
	};

	const handleShowRoute = () => {
		const source = sourceDestination?.name || typedSource.trim();
		const dest = destinationLocation?.name || typedDestination.trim();
		if (source && dest) {
			fetchRouteCoordinates(source, dest);
		}
	};

	// Preference handlers
	const handlePreferenceChange = (field: keyof TravelPreferences, value: any) => {
		setEditablePreferences(prev => PreferencesUtils.mergePreferences(prev, { [field]: value }));
	};

	const handleFlightPreferenceChange = (field: string, value: any) => {
		setEditablePreferences(prev => PreferencesUtils.mergePreferences(prev, {
			flightPreferences: {
				...prev.flightPreferences,
				[field]: value
			}
		}));
	};

	const handleInterestToggle = (interest: string) => {
		const currentInterests = editablePreferences.interests || [];
		const updatedInterests = currentInterests.includes(interest)
			? currentInterests.filter(i => i !== interest)
			: [...currentInterests, interest];
		
		setEditablePreferences(prev => PreferencesUtils.mergePreferences(prev, { interests: updatedInterests }));
	};

	const handlePlanClick = () => {
		// Check if destination is selected either from globe OR typed
		const hasDestination = preferences.destinationData || 
							   destinationLocation || 
							   (typedDestination && typedDestination.trim().length > 0) ||
							   (preferences.destination && preferences.destination.trim().length > 0);
		
		if (!hasDestination) {
			Swal.fire({
				icon: 'error',
				title: 'Validation Error',
				text: 'Please select a destination from the globe or type a destination.',
			});
			return;
		}
		if (!preferences.duration || preferences.duration < 1) {
			Swal.fire({
				icon: 'error',
				title: 'Validation Error',
				text: 'Please enter a valid duration (at least 1 day).',
			});
			return;
		}
		if (!preferences.startDate) {
			Swal.fire({
				icon: 'error',
				title: 'Validation Error',
				text: 'Please select a start date.',
			});
			return;
		}

		// Check if preferences are complete
		const isComplete = PreferencesUtils.isComplete(userTravelPreferences);
		const missingFields = PreferencesUtils.getMissingFields(userTravelPreferences);

		if (!isComplete) {
			Swal.fire({
				title: 'Complete Your Preferences',
				html: `
					<p>Some travel preferences are missing for better recommendations:</p>
					<ul style="text-align: left; margin: 10px 0;">
						${missingFields.map(field => `<li style="margin: 5px 0;">${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</li>`).join('')}
					</ul>
					<p>Would you like to complete them now?</p>
				`,
				icon: 'question',
				showCancelButton: true,
				confirmButtonText: 'Yes, complete preferences',
				cancelButtonText: 'Continue with current preferences',
				confirmButtonColor: '#667eea',
				cancelButtonColor: '#6c757d',
			}).then((result) => {
				if (result.isConfirmed) {
					setEditablePreferences(userTravelPreferences);
					setShowPreferencesForm(true);
				} else {
					triggerApiCall(preferences, userTravelPreferences);
				}
			});
		} else if (state?.user?.preferences) {
			Swal.fire({
				title: 'Edit Preferences for This Trip?',
				text: 'You have saved preferences. Would you like to customize them for this specific trip?',
				icon: 'question',
				showCancelButton: true,
				confirmButtonText: 'Yes, customize for this trip',
				cancelButtonText: 'Use my saved preferences',
				confirmButtonColor: '#667eea',
				cancelButtonColor: '#28a745',
			}).then((result) => {
				if (result.isConfirmed) {
					setEditablePreferences(userTravelPreferences);
					setShowPreferencesForm(true);
				} else {
					triggerApiCall(preferences, userTravelPreferences);
				}
			});
		} else {
			setEditablePreferences(userTravelPreferences);
			setShowPreferencesForm(true);
		}
	};

	const triggerApiCall = async (tripPreferences: TripPreferences, travelPrefs: TravelPreferences) => {
		const originCity = typedSource || (sourceDestination ? `${sourceDestination.name}, ${sourceDestination.country}` : 'Not specified');
		await planTrip(tripPreferences, travelPrefs, originCity);
	};

	const handleSubmitPreferences = async () => {
		// Validate preferences
		const errors = PreferencesUtils.validatePreferences(editablePreferences);
		if (errors.length > 0) {
			await Swal.fire({
				icon: 'error',
				title: 'Validation Error',
				html: errors.map(error => `• ${error}`).join('<br>'),
			});
			return;
		}

		// Update user preferences (sync with profile)
		setUserTravelPreferences(editablePreferences);
		
		// Update trip preferences from travel preferences
		const updatedTripPrefs = {
			...preferences,
			budget: editablePreferences.budget,
			travelers: editablePreferences.travelers,
			travelStyle: editablePreferences.travelStyle,
			interests: editablePreferences.interests
		};
		setPreferences(updatedTripPrefs);

		setShowPreferencesForm(false);
		triggerApiCall(updatedTripPrefs, editablePreferences);
	};

	useEffect(() => {
		const currentDate = format(new Date(), 'yyyy-MM-dd');
		setPreferences(prev => ({
			...prev,
			startDate: currentDate,
		}));
	}, []);

	// Sync destination changes from globe to preferences
	useEffect(() => {
		if (destinationLocation) {
			setPreferences(prev => ({
				...prev,
				destination: `${destinationLocation.name}, ${destinationLocation.country}`,
				destinationData: destinationLocation
			}));
		}
	}, [destinationLocation]);

	return (
		<>
			<Head>
				<title>Plan Trip - Hack-A-Holiday</title>
				<meta name="description" content="AI-powered travel planning assistant" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<div style={{ 
				minHeight: '100vh', 
				background: isDarkMode 
					? 'linear-gradient(135deg, #1a1f2e 0%, #16213e 100%)' 
					: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
			}}>
				<Navbar />
				<main style={{ padding: getContainerPadding() }}>
					<div style={{ maxWidth: '800px', margin: '0 auto' }}>
						<div style={{ textAlign: 'center', marginBottom: isMobile ? '30px' : '40px', color: 'white' }}>
							<div style={{ 
								display: 'flex', 
								alignItems: 'center', 
								justifyContent: 'center', 
								gap: isMobile ? '10px' : '15px',
								marginBottom: '10px'
							}}>
								<Image 
									src="/globe-logo.jpg" 
									alt="Hack-A-Holiday Globe Logo" 
									width={isMobile ? 50 : 60}
									height={isMobile ? 50 : 60}
									style={{ objectFit: 'contain' }}
								/>
								<h1 style={{ fontSize: getTitleFontSize(), margin: 0, lineHeight: '1.2' }}>
									Hack-A-Holiday
								</h1>
							</div>
							<p style={{ fontSize: getTitleFontSize(), opacity: 0.9, lineHeight: '1.4' }}>
								Your intelligent travel planning assistant
							</p>
						</div>
						<div style={{ 
							background: isDarkMode ? '#252d3d' : 'white', 
							borderRadius: '15px', 
							padding: getContainerPadding(), 
							boxShadow: isDarkMode ? '0 20px 40px rgba(0,0,0,0.6)' : '0 20px 40px rgba(0,0,0,0.1)',
							border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
							maxWidth: '1200px',
							margin: '0 auto'
						}}>
							{/* Destination Card */}
							{preferences.destinationData && (
								<DestinationCard 
									destination={preferences.destinationData}
									isMobile={isMobile}
								/>
							)}

							{/* Globe Section */}
							<GlobeSection
								isDarkMode={isDarkMode}
								isMobile={isMobile}
								sourceDestination={sourceDestination}
								destinationLocation={destinationLocation}
								typedSource={typedSource}
								typedDestination={typedDestination}
								clickStep={clickStep}
								routeData={routeData}
								loadingRoute={loadingRoute}
								preferences={preferences}
								onSourceChange={handleSourceChange}
								onDestinationChange={handleDestinationChange}
								onSwapLocations={handleSwapLocations}
								onShowRoute={handleShowRoute}
								onReset={handleResetSelection}
								onDestinationSelect={onGlobeDestinationSelect}
								globeSearchQuery={globeSearchQuery}
							/>

							{/* Trip Form */}
							<TripForm
								isDarkMode={isDarkMode}
								isMobile={isMobile}
								isTablet={isTablet}
								duration={preferences.duration}
								startDate={preferences.startDate}
								loading={loading}
								userTravelPreferences={userTravelPreferences}
								showPreferencesForm={showPreferencesForm}
								onDurationChange={(duration) => setPreferences(prev => ({ ...prev, duration }))}
								onStartDateChange={(date) => setPreferences(prev => ({ ...prev, startDate: date }))}
								onPlanClick={handlePlanClick}
							/>

							{/* Preferences Modal */}
							{showPreferencesForm && (
								<PreferencesModal
									isDarkMode={isDarkMode}
									editablePreferences={editablePreferences}
									onPreferenceChange={handlePreferenceChange}
									onFlightPreferenceChange={handleFlightPreferenceChange}
									onInterestToggle={handleInterestToggle}
									onSubmit={handleSubmitPreferences}
									onCancel={() => setShowPreferencesForm(false)}
								/>
							)}
						</div>
					</div>
				</main>
			</div>
		</>
	);
}
