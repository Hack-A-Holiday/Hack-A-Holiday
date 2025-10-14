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
	
	// Globe route visualization states
	const [sourceDestination, setSourceDestination] = useState<Destination | null>(null);
	const [destinationLocation, setDestinationLocation] = useState<Destination | null>(null);
	const [routeData, setRouteData] = useState<any>(null);
	const [loadingRoute, setLoadingRoute] = useState(false);
	const [clickStep, setClickStep] = useState<'source' | 'destination'>('source');
	const [typedSource, setTypedSource] = useState('');
	const [typedDestination, setTypedDestination] = useState('');

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
		if (clickStep === 'source') {
			// First click - set as source
			setSourceDestination(destination);
			setTypedSource(`${destination.name}, ${destination.country}`);
			setClickStep('destination');
			setResult(null);
			setError(null);
		} else {
			// Second click - set as destination and fetch route
			setDestinationLocation(destination);
			setTypedDestination(`${destination.name}, ${destination.country}`);
			setPreferences(prev => ({
				...prev,
				destination: `${destination.name}, ${destination.country}`,
				destinationData: destination
			}));
			setResult(null);
			setError(null);
			
			// Automatically fetch route with both locations
			const source = sourceDestination?.name || typedSource.trim();
			if (source) {
				fetchRouteCoordinates(source, destination.name);
			}
		}
	};

	// Fetch route coordinates using Nova Lite
	const fetchRouteCoordinates = async (source: string, destination: string) => {
		if (!source.trim() || !destination.trim()) {
			return;
		}

		setLoadingRoute(true);
		const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

		try {
			const response = await fetch(`${apiUrl}/globe/route`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ source: source.trim(), destination: destination.trim() })
			});

			const data = await response.json();
			if (data.success) {
				setRouteData(data.route);
			} else {
				console.error('Failed to fetch route:', data);
			}
		} catch (err) {
			console.error('Error fetching route:', err);
		} finally {
			setLoadingRoute(false);
		}
	};

	const handleResetSelection = () => {
		setSourceDestination(null);
		setDestinationLocation(null);
		setRouteData(null);
		setClickStep('source');
		setTypedSource('');
		setTypedDestination('');
		setPreferences(prev => ({
			...prev,
			destination: '',
			destinationData: undefined
		}));
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

	// Parse AI response text to extract daily itinerary
	const parseItineraryFromAI = (aiText: string, duration: number) => {
		const dailyPlans = [];
		
		// Try to extract days using regex patterns
		const dayPatterns = [
			/#### Day (\d+): (.+?)[\n\r]([\s\S]*?)(?=#### Day \d+:|###|$)/gi,
			/Day (\d+): (.+?)[\n\r]([\s\S]*?)(?=Day \d+:|###|$)/gi,
		];
		
		let matches: RegExpMatchArray | null = null;
		let pattern: RegExp | null = null;
		
		for (const p of dayPatterns) {
			const testMatches = Array.from(aiText.matchAll(p));
			if (testMatches.length > 0) {
				matches = testMatches as any;
				pattern = p;
				break;
			}
		}
		
		if (matches && matches.length > 0) {
			for (const match of matches as any) {
				const dayNum = parseInt(match[1]);
				const title = match[2].trim();
				const content = match[3].trim();
				
				// Parse activities from the day content
				const activities: string[] = [];
				
				// Split by lines and look for activity patterns
				const lines = content.split('\n');
				lines.forEach((line: string) => {
					const trimmed = line.trim();
					// Match lines starting with ** (bold), - (bullet), or time patterns
					if (trimmed.startsWith('-') || 
					    trimmed.startsWith('**') || 
					    /^\*\*[A-Z]/.test(trimmed) ||
					    /^[0-9]{1,2}:[0-9]{2}/.test(trimmed)) {
						// Clean up the line
						let activity = trimmed
							.replace(/^-\s*/, '')
							.replace(/^\*\*/, '')
							.replace(/\*\*:/, ':')
							.trim();
						if (activity) activities.push(activity);
					}
				});
				
				dailyPlans.push({
					day: dayNum,
					title: title,
					description: content,
					activities: activities.length > 0 ? activities : [content]
				});
			}
		}
		
		// If no structured days found, create a single day entry
		if (dailyPlans.length === 0) {
			dailyPlans.push({
				day: 1,
				title: 'Trip Overview',
				description: aiText,
				activities: [aiText]
			});
		}
		
		return dailyPlans;
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

		// Build a conversational message for the AI agent
		const originCity = typedSource || (sourceDestination ? `${sourceDestination.name}, ${sourceDestination.country}` : 'Not specified');
		
		const tripMessage = `I want to plan a trip with the following details:
- Traveling from: ${originCity}
- Destination: ${tripPreferences.destination}
- Duration: ${tripPreferences.duration} days
- Budget: $${tripPreferences.budget}
- Number of travelers: ${tripPreferences.travelers}
- Start date: ${tripPreferences.startDate}
- Travel style: ${tripPreferences.travelStyle}
- Interests: ${tripPreferences.interests.join(', ')}

Please help me create a detailed itinerary for this trip from ${originCity} to ${tripPreferences.destination}. Include daily activities, recommendations for hotels and flights (departing from ${originCity}), and make sure it fits within my budget and preferences.`;

		const requestBody = {
			message: tripMessage,
			conversationId: `trip_${Date.now()}`,
			preferences: {
				...travelPrefs,
				budget: tripPreferences.budget,
				travelers: tripPreferences.travelers,
				travelStyle: tripPreferences.travelStyle,
				interests: tripPreferences.interests,
				existingUserPreferences: state?.user?.preferences || {},
			},
			userContext: {
				userId: state.user?.id || 'anonymous',
				email: state.user?.email,
				name: state.user?.name,
				tripDetails: {
					...tripPreferences,
					origin: originCity,
					source: sourceDestination
				}
			}
		};

		try {
			// Use the same AI chat endpoint as AI Assistant
			const response = await fetch(`${apiUrl}/api/ai/chat`, {
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
				throw new Error(`API responded with status ${response.status}: ${response.statusText} - ${errorData.message || errorData.error}`);
			}
			const data = await response.json();
			
			console.log('AI Chat Response:', data);

			// Parse AI response to extract daily itinerary
			const aiResponseText = data.data?.response || data.message || 'Trip planned successfully!';
			const dailyPlans = parseItineraryFromAI(aiResponseText, tripPreferences.duration);

			// Build itinerary object from AI response
			const itinerary = {
				destination: tripPreferences.destination,
				origin: originCity,
				duration: tripPreferences.duration,
				budget: tripPreferences.budget,
				travelers: tripPreferences.travelers,
				startDate: tripPreferences.startDate,
				travelStyle: tripPreferences.travelStyle,
				interests: tripPreferences.interests,
				aiResponse: aiResponseText,
				dailyPlans: dailyPlans, // Structured daily itinerary
				recommendations: data.data?.recommendations || [],
				realData: data.data?.realData,
				conversationId: data.data?.conversationId,
				// Keep for backward compatibility
				totalBudget: `$${tripPreferences.budget}`,
				overview: {
					destination: tripPreferences.destination,
					duration: tripPreferences.duration,
					travelStyle: tripPreferences.travelStyle
				}
			};

			setResult({ success: true, itinerary });
			
			// Redirect to ai-agent with the itinerary and conversation ID
			router.push({ 
				pathname: '/ai-agent', 
				query: { 
					itinerary: JSON.stringify(itinerary),
					conversationId: data.data?.conversationId || `trip_${Date.now()}`
				} 
			});
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
				<main style={{ padding: getContainerPadding(), fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
					<div style={{ maxWidth: '800px', margin: '0 auto' }}>
						<div style={{ textAlign: 'center', marginBottom: isMobile ? '30px' : '40px', color: 'white' }}>
							<h1 style={{ fontSize: getTitleFontSize(), marginBottom: '10px', lineHeight: '1.2' }}>
								🌍 Hack-A-Holiday
							</h1>
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
							{/* Interactive Globe for Destination Selection - Always visible */}
							<div style={{ marginBottom: '30px' }}>
								<div style={{ marginBottom: '15px' }}>
									<h3 style={{ margin: '0 0 10px 0', fontSize: isMobile ? '1.3rem' : '1.6rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
										🌍 Select Destination
									</h3>
									<p style={{ margin: '0 0 15px 0', color: isDarkMode ? '#9ca3af' : '#666', fontSize: '14px', fontStyle: 'italic' }}>
										Type locations or click on the globe below
									</p>
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
						{/* Instructions for Globe Selection */}
						<div style={{ 
							marginBottom: '20px', 
							padding: '16px 20px',
							background: isDarkMode 
								? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)' 
								: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
							border: `2px solid ${isDarkMode ? 'rgba(102, 126, 234, 0.3)' : 'rgba(102, 126, 234, 0.3)'}`,
							borderRadius: '12px',
							textAlign: 'center'
						}}>
							<div style={{ 
								fontSize: '1.1rem', 
								fontWeight: 'bold', 
								marginBottom: '8px',
								color: isDarkMode ? '#e8eaed' : '#333'
							}}>
								{clickStep === 'source' ? '🛫 Step 1: Click your starting location' : '🛬 Step 2: Click your destination'}
							</div>
							<div style={{ 
								fontSize: '0.95rem', 
								color: isDarkMode ? '#9ca3af' : '#666'
							}}>
								{clickStep === 'source' 
									? 'Select where you want to travel FROM on the globe below' 
									: 'Now select where you want to travel TO'}
							</div>
						</div>
						
						{/* Source and Destination Inputs */}
						<div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
							{/* Source City Input */}
							<div>
								<label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: isDarkMode ? '#e8eaed' : '#333' }}>
									🛫 Traveling From
								</label>
								<input
									type="text"
									value={sourceDestination ? `${sourceDestination.name}, ${sourceDestination.country}` : typedSource}
									onChange={(e) => {
										const value = e.target.value;
										setTypedSource(value);
										// Clear globe selection if user is typing
										if (sourceDestination) {
											setSourceDestination(null);
										}
										// Clear route when editing
										if (routeData) {
											setRouteData(null);
										}
									}}
									placeholder="Type city or click on globe..."
									style={{
										width: '100%',
										padding: '14px 16px',
										border: `2px solid ${isDarkMode ? 'rgba(102, 126, 234, 0.5)' : 'rgba(102, 126, 234, 0.5)'}`,
										borderRadius: '12px',
										fontSize: '16px',
										backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff',
										color: isDarkMode ? '#e8eaed' : '#000',
										outline: 'none',
										transition: 'all 0.3s'
									}}
								/>
							</div>
							
							{/* Destination Input */}
							<div>
								<label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: isDarkMode ? '#e8eaed' : '#333' }}>
									🛬 Traveling To
								</label>
								<input
									type="text"
									value={destinationLocation ? `${destinationLocation.name}, ${destinationLocation.country}` : typedDestination}
									onChange={(e) => {
										const value = e.target.value;
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
									}}
									placeholder="Type city or click on globe..."
									style={{
										width: '100%',
										padding: '14px 16px',
										border: `2px solid ${isDarkMode ? 'rgba(118, 75, 162, 0.5)' : 'rgba(118, 75, 162, 0.5)'}`,
										borderRadius: '12px',
										fontSize: '16px',
										backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff',
										color: isDarkMode ? '#e8eaed' : '#000',
										outline: 'none',
										transition: 'all 0.3s'
									}}
								/>
							</div>
						</div>
						
						{/* Action Buttons */}
						<div style={{ marginBottom: '20px', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
							{/* Show Route Button (for typed inputs) */}
							{(typedSource.trim() || typedDestination.trim()) && !routeData && (
								<button
									type="button"
									onClick={() => {
										const source = sourceDestination?.name || typedSource.trim();
										const dest = destinationLocation?.name || typedDestination.trim();
										if (source && dest) {
											fetchRouteCoordinates(source, dest);
										}
									}}
									disabled={!typedSource.trim() || !typedDestination.trim() || loadingRoute}
									style={{
										padding: '12px 28px',
										background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
										color: 'white',
										border: 'none',
										borderRadius: '8px',
										fontSize: '15px',
										fontWeight: '600',
										cursor: (!typedSource.trim() || !typedDestination.trim() || loadingRoute) ? 'not-allowed' : 'pointer',
										transition: 'all 0.3s',
										opacity: (!typedSource.trim() || !typedDestination.trim() || loadingRoute) ? 0.5 : 1
									}}
								>
									🌍 Show Route on Globe
								</button>
							)}
							
							{/* Reset Button */}
							{(sourceDestination || destinationLocation || typedSource || typedDestination) && (
								<button
									type="button"
									onClick={handleResetSelection}
									style={{
										padding: '12px 24px',
										background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
										color: isDarkMode ? '#e8eaed' : '#374151',
										border: 'none',
										borderRadius: '8px',
										fontSize: '14px',
										fontWeight: '600',
										cursor: 'pointer',
										transition: 'all 0.3s'
									}}
								>
									🔄 Reset Selection
								</button>
							)}
						</div>
						
						{/* Loading Route Message */}
						{loadingRoute && (
							<div style={{
								padding: '14px 20px',
								marginBottom: '20px',
								background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
								border: '2px solid rgba(102, 126, 234, 0.4)',
								borderRadius: '12px',
								color: isDarkMode ? '#a5b4fc' : '#667eea',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								gap: '10px',
								fontWeight: '600'
							}}>
								<span style={{ fontSize: '1.5rem' }}>⏳</span>
								<span>Fetching route coordinates from AWS Bedrock...</span>
							</div>
						)}
						
						{/* Route Success Message */}
						{routeData && !loadingRoute && (
							<div style={{
								padding: '14px 20px',
									marginBottom: '20px',
									background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.15) 0%, rgba(72, 187, 120, 0.15) 100%)',
									border: '2px solid rgba(78, 205, 196, 0.4)',
									borderRadius: '12px',
									color: isDarkMode ? '#4ecdcc' : '#0d9488',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									gap: '10px',
									fontWeight: '600'
								}}>
									<span style={{ fontSize: '1.5rem' }}>✈️</span>
									<span>Route displayed on globe!</span>
								</div>
							)}
							
							{/* Interactive Globe */}
							<InteractiveGlobe
								onDestinationSelect={handleDestinationSelect}
								selectedDestination={preferences.destinationData}
								searchQuery={globeSearchQuery}
								routeData={routeData}
							/>
						</div>							{/* Trip Planning Form */}
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