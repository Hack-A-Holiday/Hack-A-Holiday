import React from 'react';
import { TravelPreferences, preferenceOptions, PreferencesUtils } from '@/types/preferences';

interface PreferencesModalProps {
	isDarkMode: boolean;
	editablePreferences: TravelPreferences;
	onPreferenceChange: (field: keyof TravelPreferences, value: any) => void;
	onFlightPreferenceChange: (field: string, value: any) => void;
	onInterestToggle: (interest: string) => void;
	onSubmit: () => void;
	onCancel: () => void;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
	isDarkMode,
	editablePreferences,
	onPreferenceChange,
	onFlightPreferenceChange,
	onInterestToggle,
	onSubmit,
	onCancel
}) => {
	return (
		<div className="card card-elevated" style={{ 
			borderRadius: '15px', 
			padding: '30px', 
			marginTop: '20px'
		}}>
			<h3 style={{ 
				marginBottom: '20px', 
				fontSize: '1.6rem', 
				fontWeight: 'bold', 
				background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
				WebkitBackgroundClip: 'text', 
				WebkitTextFillColor: 'transparent', 
				backgroundClip: 'text' 
			}}>
				Customize Your Travel Preferences
			</h3>
			
			{/* Basic Information */}
			<div style={{ marginBottom: '25px' }}>
				<h4 style={{ marginBottom: '15px', color: isDarkMode ? '#9ca3af' : '#495057' }}>Basic Information</h4>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
					<div>
						<label className="form-label">
							Budget ($)
						</label>
						<input
							type="number"
							value={editablePreferences.budget}
							onChange={(e) => onPreferenceChange('budget', parseInt(e.target.value))}
							min="100"
							max="100000"
							className="form-input"
						/>
					</div>

					<div>
						<label className="form-label">
							Travelers
						</label>
						<input
							type="number"
							value={editablePreferences.travelers}
							onChange={(e) => onPreferenceChange('travelers', parseInt(e.target.value))}
							min="1"
							max="20"
							className="form-input"
						/>
					</div>

					<div>
						<label className="form-label">
							Travel Style
						</label>
						<select
							value={editablePreferences.travelStyle}
							onChange={(e) => onPreferenceChange('travelStyle', e.target.value)}
							className="form-input"
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
				<h4 style={{ marginBottom: '15px', color: isDarkMode ? '#9ca3af' : '#495057' }}>Flight Preferences</h4>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
					<div>
						<label className="form-label">
							Cabin Class
						</label>
						<select
							value={editablePreferences.flightPreferences.cabinClass}
							onChange={(e) => onFlightPreferenceChange('cabinClass', e.target.value)}
							className="form-input"
						>
							{preferenceOptions.cabinClasses.map((cabin) => (
								<option key={cabin.value} value={cabin.value}>
									{cabin.label}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="form-label">
							Preferred Time
						</label>
						<select
							value={editablePreferences.flightPreferences.timePreference}
							onChange={(e) => onFlightPreferenceChange('timePreference', e.target.value)}
							className="form-input"
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
							onChange={(e) => onFlightPreferenceChange('preferDirect', e.target.checked)}
						/>
						<label htmlFor="preferDirect" className="form-label" style={{ marginBottom: 0 }}>
							Prefer Direct Flights
						</label>
					</div>
				</div>
			</div>

			{/* Interests */}
			<div style={{ marginBottom: '25px' }}>
				<h4 style={{ marginBottom: '15px', color: isDarkMode ? '#9ca3af' : '#495057' }}>Travel Interests</h4>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
					{preferenceOptions.interests.map((interest) => (
						<label key={interest} className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
							<input
								type="checkbox"
								checked={(editablePreferences.interests || []).includes(interest)}
								onChange={() => onInterestToggle(interest)}
							/>
							<span style={{ textTransform: 'capitalize' }}>{interest.replace('-', ' ')}</span>
						</label>
					))}
				</div>
			</div>

			<div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
				<button
					type="button"
					onClick={onCancel}
					className="btn-secondary"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={onSubmit}
					className="btn-primary"
				>
					Save & Continue
				</button>
			</div>
		</div>
	);
};
