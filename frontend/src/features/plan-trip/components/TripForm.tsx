import React from 'react';
import { TravelPreferences } from '@/types/preferences';
import { FaRobot, FaStar } from 'react-icons/fa';

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
		<form onSubmit={e => e.preventDefault()} style={{ marginTop: isMobile ? '20px' : '30px' }}>
			<div style={{ display: 'grid', gridTemplateColumns: getGridColumns(), gap: isMobile ? '15px' : '20px', marginBottom: isMobile ? '20px' : '25px' }}>
				<div>
					<label htmlFor="duration" className="form-label" style={{ fontSize: isMobile ? '0.95rem' : '1rem' }}>
						Duration (days)
					</label>
					<input
						id="duration"
						type="number"
						value={duration}
						onChange={(e) => onDurationChange(parseInt(e.target.value))}
						className="form-input"
						style={{ 
							margin: '10px 0',
							minHeight: isMobile ? '48px' : '52px',
							fontSize: isMobile ? '16px' : '1rem',
							touchAction: 'manipulation'
						}}
						min="1"
						max="30"
						required
					/>
				</div>
				<div>
					<label htmlFor="start-date-input" className="form-label" style={{ fontSize: isMobile ? '0.95rem' : '1rem' }}>
						Start Date
					</label>
					<input
						id="start-date-input"
						type="date"
						value={startDate}
						onChange={(e) => onStartDateChange(e.target.value)}
						className="form-input"
						style={{ 
							margin: '10px 0',
							minHeight: isMobile ? '48px' : '52px',
							fontSize: isMobile ? '16px' : '1rem',
							touchAction: 'manipulation'
						}}
						required
					/>
				</div>
			</div>

			{/* Current Preferences Summary */}
			{!showPreferencesForm && (
				<div style={{ 
					background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8f9fa', 
					padding: isMobile ? '16px' : '20px', 
					borderRadius: isMobile ? '8px' : '10px', 
					marginBottom: isMobile ? '16px' : '20px',
					border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
				}}>
					<h4 style={{ 
						margin: '0 0 15px 0', 
						color: isDarkMode ? '#8b9cff' : '#495057',
						fontSize: isMobile ? '1rem' : '1.1rem'
					}}>Current Preferences</h4>
					<div style={{ 
						display: 'grid', 
						gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
						gap: isMobile ? '8px' : '10px', 
						fontSize: isMobile ? '0.85rem' : '0.9rem',
						color: isDarkMode ? '#9ca3af' : '#333'
					}}>
						<div><strong style={{ color: isDarkMode ? '#e8eaed' : '#000' }}>Style:</strong> {userTravelPreferences.travelStyle}</div>
						<div><strong style={{ color: isDarkMode ? '#e8eaed' : '#000' }}>Budget:</strong> ${userTravelPreferences.budget}</div>
						<div><strong style={{ color: isDarkMode ? '#e8eaed' : '#000' }}>Travelers:</strong> {userTravelPreferences.travelers}</div>
						<div><strong style={{ color: isDarkMode ? '#e8eaed' : '#000' }}>Flight Class:</strong> {userTravelPreferences.flightPreferences.cabinClass}</div>
					</div>
					{userTravelPreferences.interests.length > 0 && (
						<div style={{ 
							marginTop: '10px', 
							color: isDarkMode ? '#9ca3af' : '#333',
							fontSize: isMobile ? '0.85rem' : '0.9rem'
						}}>
							<strong style={{ color: isDarkMode ? '#e8eaed' : '#000' }}>Interests:</strong> {userTravelPreferences.interests.slice(0, 3).join(', ')}
							{userTravelPreferences.interests.length > 3 && ` +${userTravelPreferences.interests.length - 3} more`}
						</div>
					)}
				</div>
			)}

			<button
				type="button"
				onClick={onPlanClick}
				className="btn-primary btn-large"
				style={{ 
					width: '100%',
					fontSize: isMobile ? '16px' : '18px',
					minHeight: isMobile ? '50px' : '56px',
					padding: isMobile ? '14px 20px' : '16px 24px',
					touchAction: 'manipulation'
				}}
				disabled={loading}
			>
				{loading ? (
					<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
						<FaRobot style={{ fontSize: '1.2rem', color: '#fbbf24' }} />
						<span>Creating your adventure...</span>
					</span>
				) : (
					<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
						<FaStar style={{ fontSize: '1.2rem', color: '#fbbf24' }} />
						<span>Plan My Adventure</span>
					</span>
				)}
			</button>
		</form>
	);
};
