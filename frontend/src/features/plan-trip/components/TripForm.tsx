import React from 'react';
import { TravelPreferences } from '@/types/preferences';

interface TripFormProps {
	isDarkMode: boolean;
	isMobile: boolean;
	isTablet: boolean;
	duration: number;
	startDate: string;
	loading: boolean;
	userTravelPreferences: TravelPreferences;
	showPreferencesForm: boolean;
	onDurationChange: (duration: number) => void;
	onStartDateChange: (date: string) => void;
	onPlanClick: () => void;
}

export const TripForm: React.FC<TripFormProps> = ({
	isDarkMode,
	isMobile,
	isTablet,
	duration,
	startDate,
	loading,
	userTravelPreferences,
	showPreferencesForm,
	onDurationChange,
	onStartDateChange,
	onPlanClick
}) => {
	const getGridColumns = () => {
		if (isMobile) return '1fr';
		return '1fr 1fr';
	};

	return (
		<form onSubmit={e => e.preventDefault()} style={{ marginTop: '30px' }}>
			<div style={{ display: 'grid', gridTemplateColumns: getGridColumns(), gap: isMobile ? '15px' : '20px', marginBottom: '25px' }}>
				<div>
					<label htmlFor="duration" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: isDarkMode ? '#e8eaed' : '#333' }}>
						Duration (days)
					</label>
					<input
						id="duration"
						type="number"
						value={duration}
						onChange={(e) => onDurationChange(parseInt(e.target.value))}
						style={{ 
							width: '100%', 
							padding: '12px 15px', 
							border: '2px solid #e1e5e9', 
							borderRadius: '8px', 
							fontSize: '16px', 
							margin: '10px 0',
							backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff',
							color: isDarkMode ? '#e8eaed' : '#000'
						}}
						min="1"
						max="30"
						required
					/>
				</div>
				<div>
					<label htmlFor="start-date-input" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: isDarkMode ? '#e8eaed' : '#333' }}>
						Start Date
					</label>
					<input
						id="start-date-input"
						type="date"
						value={startDate}
						onChange={(e) => onStartDateChange(e.target.value)}
						style={{ 
							width: '100%', 
							padding: '12px 15px', 
							border: '2px solid #e1e5e9', 
							borderRadius: '8px', 
							fontSize: '16px', 
							margin: '10px 0',
							backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff',
							color: isDarkMode ? '#e8eaed' : '#000'
						}}
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
				onClick={onPlanClick}
				style={{ 
					width: '100%', 
					background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
					color: 'white', 
					border: 'none', 
					padding: '15px 30px', 
					fontSize: '18px', 
					fontWeight: '600', 
					borderRadius: '8px', 
					cursor: loading ? 'not-allowed' : 'pointer' 
				}}
				disabled={loading}
			>
				{loading ? '🤖 Creating your adventure...' : '🌟 Plan My Adventure'}
			</button>
		</form>
	);
};
