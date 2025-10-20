import React from 'react';
import dynamic from 'next/dynamic';
import { Destination } from '@/data/destinations';

const InteractiveGlobe = dynamic(() => import('@/components/InteractiveGlobe'), {
	ssr: false,
	loading: () => <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading globe...</div>
});

interface GlobeSectionProps {
	isDarkMode: boolean;
	isMobile: boolean;
	sourceDestination: Destination | null;
	destinationLocation: Destination | null;
	typedSource: string;
	typedDestination: string;
	clickStep: 'source' | 'destination';
	routeData: any;
	loadingRoute: boolean;
	preferences: any;
	onSourceChange: (value: string) => void;
	onDestinationChange: (value: string) => void;
	onSwapLocations: () => void;
	onShowRoute: () => void;
	onReset: () => void;
	onDestinationSelect: (destination: Destination) => void;
	globeSearchQuery: string;
}

export const GlobeSection: React.FC<GlobeSectionProps> = ({
	isDarkMode,
	isMobile,
	sourceDestination,
	destinationLocation,
	typedSource,
	typedDestination,
	clickStep,
	routeData,
	loadingRoute,
	preferences,
	onSourceChange,
	onDestinationChange,
	onSwapLocations,
	onShowRoute,
	onReset,
	onDestinationSelect,
	globeSearchQuery
}) => {
	return (
		<div style={{ marginBottom: '30px' }}>
			<div style={{ marginBottom: '15px' }}>
				<h3 style={{ margin: '0 0 10px 0', fontSize: isMobile ? '1.3rem' : '1.6rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
					🌍 Select Destination
				</h3>
				<p style={{ margin: '0 0 15px 0', color: isDarkMode ? '#9ca3af' : '#666', fontSize: '14px', fontStyle: 'italic' }}>
					Type locations or click on the globe below
				</p>
			</div>
			
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
			
			{/* Source and Destination Inputs with Switch Button */}
			<div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', marginBottom: '20px', flexDirection: isMobile ? 'column' : 'row' }}>
				{/* Source City Input */}
				<div style={{ flex: 1, width: isMobile ? '100%' : 'auto' }}>
					<label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: isDarkMode ? '#e8eaed' : '#333' }}>
						🛫 Traveling From
					</label>
					<input
						type="text"
						value={sourceDestination ? `${sourceDestination.name}, ${sourceDestination.country}` : typedSource}
						onChange={(e) => onSourceChange(e.target.value)}
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
				
				{/* Switch Button */}
				<button
					type="button"
					onClick={onSwapLocations}
					style={{
						padding: '14px 16px',
						background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
						color: 'white',
						border: 'none',
						borderRadius: '12px',
						fontSize: '20px',
						cursor: 'pointer',
						transition: 'all 0.3s',
						boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						minWidth: '52px',
						height: '52px',
						flexShrink: 0
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.transform = 'scale(1.1) rotate(180deg)';
						e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
						e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
					}}
					title="Switch locations"
				>
					⇄
				</button>
				
				{/* Destination Input */}
				<div style={{ flex: 1, width: isMobile ? '100%' : 'auto' }}>
					<label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: isDarkMode ? '#e8eaed' : '#333' }}>
						🛬 Traveling To
					</label>
					<input
						type="text"
						value={destinationLocation ? `${destinationLocation.name}, ${destinationLocation.country}` : typedDestination}
						onChange={(e) => onDestinationChange(e.target.value)}
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
						onClick={onShowRoute}
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
						onClick={onReset}
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
				onDestinationSelect={onDestinationSelect}
				selectedDestination={preferences.destinationData}
				searchQuery={globeSearchQuery}
				routeData={routeData}
			/>
		</div>
	);
};
