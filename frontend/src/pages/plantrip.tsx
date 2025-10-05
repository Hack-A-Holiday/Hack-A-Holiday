import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import Navbar from '../components/layout/Navbar';
import { Destination } from '../data/destinations';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { TravelPreferences, defaultTravelPreferences, preferenceOptions, PreferencesUtils } from '../types/preferences';

const InteractiveGlobe = dynamic(() => import('../components/InteractiveGlobe'), {
	ssr: false,
	loading: () => <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading globe...</div>
});

interface TripPreferences {
	destination: string;
	destinationData?: Destination;
	budget: number;
	duration: number;
	interests: string[];
	startDate: string;
	travelers: number;
	travelStyle: 'budget' | 'mid-range' | 'luxury';
}

interface ApiResponse {
	success: boolean;
	tripId?: string;
	itinerary?: any;
	message?: string;
	error?: any;
	requestId?: string;
	timestamp?: string;
}

export default function PlanTrip() {
	const { state } = useAuth();
	const { isDarkMode } = useDarkMode();
	const router = useRouter();
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

	const [loading, setLoading] = useState(false);
	const [globeSearchQuery, setGlobeSearchQuery] = useState('');
	const [result, setResult] = useState<ApiResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [showPreferencesForm, setShowPreferencesForm] = useState(false);
	const [editablePreferences, setEditablePreferences] = useState<TravelPreferences>(userTravelPreferences);

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

	const getGridColumns = () => {
		if (isMobile) return '1fr';
		return '1fr 1fr';
	};

	const handleDestinationSelect = (destination: Destination) => {
		setPreferences(prev => ({
			...prev,
			destination: `${destination.name}, ${destination.country}`,
			destinationData: destination
		}));
		setResult(null);
		setError(null);
	};

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
		if (!preferences.destinationData) {
			Swal.fire({
				icon: 'error',
				title: 'Validation Error',
				text: 'Please select a destination from the globe.',
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
		setLoading(true);
		setError(null);
		setResult(null);
		const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...(state.token && { Authorization: `Bearer ${state.token}` }),
		};
		const requestBody = {
			preferences: {
				...tripPreferences,
				travelPreferences: travelPrefs,
				existingUserPreferences: state?.user?.preferences || {},
			},
		};
		try {
			const response = await fetch(`${apiUrl}/plan-trip`, {
				method: 'POST',
				headers,
				body: JSON.stringify(requestBody),
				credentials: 'include',
			});
			if (!response.ok) {
				let errorText = await response.text();
				let errorData;
				try {
					errorData = JSON.parse(errorText);
				} catch {
					errorData = { message: errorText };
				}
				console.error('API Error Response:', errorData);
				throw new Error(`API responded with status ${response.status}: ${response.statusText} - ${errorData.message}`);
			}
			const data = await response.json();
			// Robust mapping for Bedrock response
			let itinerary = data.itinerary || data;
			if (itinerary.itinerary) itinerary = itinerary.itinerary;
			if (itinerary.dailyItinerary || itinerary.dailyPlans) {
				itinerary.dailyItinerary = itinerary.dailyItinerary || itinerary.dailyPlans;
			}
			if (itinerary.destination || (itinerary.overview && itinerary.overview.destination)) {
				itinerary.destination = itinerary.destination || (itinerary.overview && itinerary.overview.destination);
			}
			if (itinerary.totalBudget || itinerary.budget || itinerary.totalCost) {
				itinerary.totalBudget = itinerary.totalBudget || itinerary.budget || itinerary.totalCost;
			}
			if (itinerary.duration || tripPreferences.duration) {
				itinerary.duration = itinerary.duration || tripPreferences.duration;
			}
			setResult(data);
			router.push({ pathname: '/ai-agent', query: { itinerary: JSON.stringify(itinerary) } });
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Network error');
		} finally {
			setLoading(false);
		}
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
		setPreferences((prev) => ({
			...prev,
			startDate: currentDate,
		}));
	}, []);

	// Preference editing form component
	const PreferencesEditForm = () => (
		<div style={{ background: 'white', borderRadius: '15px', padding: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', marginTop: '20px' }}>
			<h3 style={{ marginBottom: '20px', fontSize: '1.6rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
				Customize Your Travel Preferences
			</h3>
			
			{/* Basic Information */}
			<div style={{ marginBottom: '25px' }}>
				<h4 style={{ marginBottom: '15px', color: '#495057' }}>Basic Information</h4>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
					<div>
						<label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
							Budget ($)
						</label>
						<input
							type="number"
							value={editablePreferences.budget}
							onChange={(e) => handlePreferenceChange('budget', parseInt(e.target.value))}
							min="100"
							max="100000"
							style={{ width: '100%', padding: '10px', border: '2px solid #e1e5e9', borderRadius: '8px' }}
						/>
					</div>

					<div>
						<label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
							Travelers
						</label>
						<input
							type="number"
							value={editablePreferences.travelers}
							onChange={(e) => handlePreferenceChange('travelers', parseInt(e.target.value))}
							min="1"
							max="20"
							style={{ width: '100%', padding: '10px', border: '2px solid #e1e5e9', borderRadius: '8px' }}
						/>
					</div>

					<div>
						<label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
							Travel Style
						</label>
						<select
							value={editablePreferences.travelStyle}
							onChange={(e) => handlePreferenceChange('travelStyle', e.target.value)}
							style={{ width: '100%', padding: '10px', border: '2px solid #e1e5e9', borderRadius: '8px' }}
						>
							{preferenceOptions.travelStyles.map((style) => (
								<option key={style.value} value={style.value}>
									{style.label}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* Flight Preferences */}
			<div style={{ marginBottom: '25px' }}>
				<h4 style={{ marginBottom: '15px', color: '#495057' }}>Flight Preferences</h4>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
					<div>
						<label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
							Cabin Class
						</label>
						<select
							value={editablePreferences.flightPreferences.cabinClass}
							onChange={(e) => handleFlightPreferenceChange('cabinClass', e.target.value)}
							style={{ width: '100%', padding: '10px', border: '2px solid #e1e5e9', borderRadius: '8px' }}
						>
							{preferenceOptions.cabinClasses.map((cabin) => (
								<option key={cabin.value} value={cabin.value}>
									{cabin.label}
								</option>
							))}
						</select>
					</div>

					<div>
						<label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
							Preferred Time
						</label>
						<select
							value={editablePreferences.flightPreferences.timePreference}
							onChange={(e) => handleFlightPreferenceChange('timePreference', e.target.value)}
							style={{ width: '100%', padding: '10px', border: '2px solid #e1e5e9', borderRadius: '8px' }}
						>
							{preferenceOptions.timePreferences.map((time) => (
								<option key={time.value} value={time.value}>
									{time.label}
								</option>
							))}
						</select>
					</div>

					<div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
						<input
							type="checkbox"
							id="preferDirect"
							checked={editablePreferences.flightPreferences.preferDirect}
							onChange={(e) => handleFlightPreferenceChange('preferDirect', e.target.checked)}
						/>
						<label htmlFor="preferDirect" style={{ fontWeight: '600' }}>
							Prefer Direct Flights
						</label>
					</div>
				</div>
			</div>

			{/* Interests */}
			<div style={{ marginBottom: '25px' }}>
				<h4 style={{ marginBottom: '15px', color: '#495057' }}>Travel Interests</h4>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
					{preferenceOptions.interests.map((interest) => (
						<label key={interest} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<input
								type="checkbox"
								checked={(editablePreferences.interests || []).includes(interest)}
								onChange={() => handleInterestToggle(interest)}
							/>
							<span style={{ textTransform: 'capitalize' }}>{interest.replace('-', ' ')}</span>
						</label>
					))}
				</div>
			</div>

			<div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
				<button
					type="button"
					onClick={() => setShowPreferencesForm(false)}
					style={{ 
						background: '#6c757d', 
						color: 'white', 
						border: 'none', 
						padding: '12px 24px', 
						fontSize: '16px', 
						fontWeight: '600', 
						borderRadius: '8px', 
						cursor: 'pointer' 
					}}
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={handleSubmitPreferences}
					style={{ 
						background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
						color: 'white', 
						border: 'none', 
						padding: '12px 24px', 
						fontSize: '16px', 
						fontWeight: '600', 
						borderRadius: '8px', 
						cursor: 'pointer' 
					}}
				>
					Save & Continue
				</button>
			</div>
		</div>
	);

	return (
		<>
			<Head>
				<title>Plan Trip - Hack-A-Holiday</title>
				<meta name="description" content="AI-powered travel planning with Claude 4" />
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
				<main style={{ padding: getContainerPadding(), fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
					<div style={{ maxWidth: '800px', margin: '0 auto' }}>
						<div style={{ textAlign: 'center', marginBottom: isMobile ? '30px' : '40px', color: 'white' }}>
							<h1 style={{ fontSize: getTitleFontSize(), marginBottom: '10px', lineHeight: '1.2' }}>
								🌍 Hack-A-Holiday
							</h1>
							<p style={{ fontSize: getTitleFontSize(), opacity: 0.9, lineHeight: '1.4' }}>
								AI-powered trip planning with Claude 4
							</p>
						</div>
						<div style={{ 
							background: isDarkMode ? '#252d3d' : 'white', 
							borderRadius: '15px', 
							padding: getContainerPadding(), 
							boxShadow: isDarkMode ? '0 20px 40px rgba(0,0,0,0.6)' : '0 20px 40px rgba(0,0,0,0.1)',
							border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
						}}>
							{/* Interactive Globe for Destination Selection - Always visible */}
							<div style={{ marginBottom: '30px' }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '0' }}>
									<h3 style={{ margin: '0 0 10px 0', fontSize: isMobile ? '1.3rem' : '1.6rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
										🌍 Choose Your Destination
									</h3>
									<p style={{ margin: '0 0 15px 0', color: isDarkMode ? '#9ca3af' : '#666', fontSize: '14px', fontStyle: 'italic' }}>
										Explore the world and select your perfect travel destination
									</p>
									<input
										type="text"
										value={globeSearchQuery}
										onChange={(e) => setGlobeSearchQuery(e.target.value)}
										placeholder="🔍 Search destinations..."
										style={{ 
											padding: '12px 20px', 
											border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid #e1e5e9', 
											borderRadius: '25px', 
											fontSize: '14px', 
											width: '100%', 
											outline: 'none', 
											marginBottom: '20px', 
											transition: 'border-color 0.3s ease, box-shadow 0.3s ease', 
											boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.6)' : '0 2px 8px rgba(0,0,0,0.1)',
											backgroundColor: isDarkMode ? '#1a1f2e' : 'white',
											color: isDarkMode ? '#e8eaed' : '#000'
										}}
									/>
								</div>
								{preferences.destinationData && (
									<div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)', border: '1px solid rgba(255,255,255,0.2)' }}>
										<div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
											<span style={{ fontSize: '1.5rem' }}>📍</span>
											<span>{preferences.destinationData.name}, {preferences.destinationData.country}</span>
										</div>
										<div style={{ opacity: 0.9, fontSize: '0.95rem', marginBottom: '12px' }}>
											{preferences.destinationData.description}
										</div>
										<div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '0.9rem', flexWrap: 'wrap' }}>
											<div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
												<span>💰</span>
												<span>{preferences.destinationData.averageCost}</span>
											</div>
											<div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
												<span>🏷️</span>
												<span style={{ textTransform: 'capitalize' }}>{preferences.destinationData.category}</span>
											</div>
											<div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
												<span>📅</span>
												<span>Best: {preferences.destinationData.bestMonths.slice(0, 2).join(', ')}</span>
											</div>
										</div>
									</div>
								)}
								<InteractiveGlobe
									onDestinationSelect={handleDestinationSelect}
									selectedDestination={preferences.destinationData}
									searchQuery={globeSearchQuery}
								/>
							</div>
							
							{/* Trip Planning Form */}
							<form onSubmit={e => e.preventDefault()} style={{ marginTop: '30px' }}>
								<div style={{ display: 'grid', gridTemplateColumns: getGridColumns(), gap: isMobile ? '15px' : '20px', marginBottom: '25px' }}>
									<div>
										<label htmlFor="duration" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
											Duration (days)
										</label>
										<input
											id="duration"
											type="number"
											value={preferences.duration}
											onChange={(e) => setPreferences(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
											style={{ width: '100%', padding: '12px 15px', border: '2px solid #e1e5e9', borderRadius: '8px', fontSize: '16px', margin: '10px 0' }}
											min="1"
											max="30"
											required
										/>
									</div>
									<div>
										<label htmlFor="start-date-input" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
											Start Date
										</label>
										<input
											id="start-date-input"
											type="date"
											value={preferences.startDate}
											onChange={(e) => setPreferences(prev => ({ ...prev, startDate: e.target.value }))}
											style={{ width: '100%', padding: '12px 15px', border: '2px solid #e1e5e9', borderRadius: '8px', fontSize: '16px', margin: '10px 0' }}
											required
										/>
									</div>
								</div>

								{/* Current Preferences Summary */}
								{!showPreferencesForm && (
									<div style={{ 
										background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8f9fa', 
										padding: '20px', 
										borderRadius: '10px', 
										marginBottom: '20px',
										border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
									}}>
										<h4 style={{ margin: '0 0 15px 0', color: isDarkMode ? '#8b9cff' : '#495057' }}>Current Preferences</h4>
										<div style={{ 
											display: 'grid', 
											gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
											gap: '10px', 
											fontSize: '0.9rem',
											color: isDarkMode ? '#9ca3af' : '#333'
										}}>
											<div><strong style={{ color: isDarkMode ? '#e8eaed' : '#000' }}>Style:</strong> {userTravelPreferences.travelStyle}</div>
											<div><strong style={{ color: isDarkMode ? '#e8eaed' : '#000' }}>Budget:</strong> ${userTravelPreferences.budget}</div>
											<div><strong style={{ color: isDarkMode ? '#e8eaed' : '#000' }}>Travelers:</strong> {userTravelPreferences.travelers}</div>
											<div><strong style={{ color: isDarkMode ? '#e8eaed' : '#000' }}>Flight Class:</strong> {userTravelPreferences.flightPreferences.cabinClass}</div>
										</div>
										{userTravelPreferences.interests.length > 0 && (
											<div style={{ marginTop: '10px', color: isDarkMode ? '#9ca3af' : '#333' }}>
												<strong style={{ color: isDarkMode ? '#e8eaed' : '#000' }}>Interests:</strong> {userTravelPreferences.interests.slice(0, 3).join(', ')}
												{userTravelPreferences.interests.length > 3 && ` +${userTravelPreferences.interests.length - 3} more`}
											</div>
										)}
									</div>
								)}

								<button
									type="button"
									onClick={handlePlanClick}
									style={{ width: '100%', background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', padding: '15px 30px', fontSize: '18px', fontWeight: '600', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer' }}
								>
									{loading ? '🤖 Creating your adventure...' : '🌟 Plan My Adventure'}
								</button>
							</form>

							{/* Preferences Edit Form */}
							{showPreferencesForm && <PreferencesEditForm />}
						</div>
					</div>
				</main>
			</div>
		</>
	);
}