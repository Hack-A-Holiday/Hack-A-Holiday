import React from 'react';
import dynamic from 'next/dynamic';
import { Destination } from '@/data/destinations';
import { FaGlobeAmericas, FaPlaneDeparture, FaPlaneArrival, FaPlane, FaRedo } from 'react-icons/fa';

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
		<div style={{ marginBottom: isMobile ? '20px' : '30px' }}>
			<div style={{ marginBottom: isMobile ? '12px' : '15px' }}>
				<h3 style={{ 
					margin: '0 0 10px 0', 
					fontSize: isMobile ? '1.1rem' : '1.6rem', 
					fontWeight: 'bold', 
					display: 'flex', 
					alignItems: 'center', 
					gap: isMobile ? '6px' : '8px' 
				}}>
					<FaGlobeAmericas style={{ 
						fontSize: isMobile ? '1.3em' : '1.5em',
						color: '#4285f4'
					}} />
					<span style={{ 
						background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
						WebkitBackgroundClip: 'text', 
						WebkitTextFillColor: 'transparent', 
						backgroundClip: 'text' 
					}}>Select Destination</span>
				</h3>
				<p style={{ 
					margin: '0 0 15px 0', 
					color: isDarkMode ? '#9ca3af' : '#666', 
					fontSize: isMobile ? '0.85rem' : '14px', 
					fontStyle: 'italic' 
				}}>
					{isMobile ? 'Type or tap globe' : 'Type locations or click on the globe below'}
				</p>
			</div>
			
			{/* Instructions for Globe Selection */}
			<div style={{ 
				marginBottom: isMobile ? '16px' : '20px', 
				padding: isMobile ? '12px 14px' : '16px 20px',
				background: isDarkMode 
					? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)' 
					: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
				border: `2px solid ${isDarkMode ? 'rgba(102, 126, 234, 0.3)' : 'rgba(102, 126, 234, 0.3)'}`,
				borderRadius: isMobile ? '10px' : '12px',
				textAlign: 'center'
			}}>
				<div style={{ 
					fontSize: isMobile ? '0.95rem' : '1.1rem', 
					fontWeight: 'bold', 
					marginBottom: isMobile ? '6px' : '8px',
					color: isDarkMode ? '#e8eaed' : '#333',
					display: 'flex',
					alignItems: 'center',
					gap: '8px'
				}}>
					{clickStep === 'source' ? (
						<>
							<FaPlaneDeparture style={{ color: '#3b82f6' }} />
							<span>Step 1: Click your starting location</span>
						</>
					) : (
						<>
							<FaPlaneArrival style={{ color: '#10b981' }} />
							<span>Step 2: Click your destination</span>
						</>
					)}
				</div>
				<div style={{ 
					fontSize: isMobile ? '0.8rem' : '0.95rem', 
					color: isDarkMode ? '#9ca3af' : '#666'
				}}>
					{clickStep === 'source' 
						? (isMobile ? 'Select starting point on globe' : 'Select where you want to travel FROM on the globe below')
						: (isMobile ? 'Select destination on globe' : 'Now select where you want to travel TO')}
				</div>
			</div>
			
			{/* Source and Destination Inputs with Switch Button */}
			<div style={{ 
				display: 'flex', 
				alignItems: 'flex-end', 
				gap: isMobile ? '12px' : '15px', 
				marginBottom: isMobile ? '16px' : '20px', 
				flexDirection: isMobile ? 'column' : 'row' 
			}}>
				{/* Source City Input */}
				<div style={{ flex: 1, width: isMobile ? '100%' : 'auto' }}>
					<label style={{ 
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
						marginBottom: '8px', 
						fontWeight: '600', 
						fontSize: isMobile ? '0.9rem' : '1rem',
						color: isDarkMode ? '#e8eaed' : '#333' 
					}}>
						<FaPlaneDeparture style={{ color: '#3b82f6', fontSize: '1rem' }} />
						<span>Traveling From</span>
					</label>
					<input
						type="text"
						value={sourceDestination ? `${sourceDestination.name}, ${sourceDestination.country}` : typedSource}
						onChange={(e) => onSourceChange(e.target.value)}
						placeholder={isMobile ? "Starting city..." : "Type city or click on globe..."}
						style={{
							width: '100%',
							padding: isMobile ? '12px 14px' : '14px 16px',
							border: `2px solid ${isDarkMode ? 'rgba(102, 126, 234, 0.5)' : 'rgba(102, 126, 234, 0.5)'}`,
							borderRadius: isMobile ? '10px' : '12px',
							fontSize: '16px',
							minHeight: isMobile ? '48px' : 'auto',
							backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff',
							color: isDarkMode ? '#e8eaed' : '#000',
							outline: 'none',
							transition: 'all 0.3s',
							touchAction: 'manipulation'
						}}
					/>
				</div>
				
				{/* Switch Button */}
				<button
					type="button"
					onClick={onSwapLocations}
					style={{
						padding: isMobile ? '12px 14px' : '14px 16px',
						background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
						color: 'white',
						border: 'none',
						borderRadius: isMobile ? '10px' : '12px',
						fontSize: isMobile ? '18px' : '20px',
						cursor: 'pointer',
						transition: 'all 0.3s',
						boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						minWidth: isMobile ? '48px' : '52px',
						height: isMobile ? '48px' : '52px',
						flexShrink: 0,
						touchAction: 'manipulation'
					}}
					onMouseEnter={(e) => {
						if (!isMobile) {
							e.currentTarget.style.transform = 'scale(1.1) rotate(180deg)';
							e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
						}
					}}
					onMouseLeave={(e) => {
						if (!isMobile) {
							e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
							e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
						}
					}}
					title="Switch locations"
				>
					⇄
				</button>
				
				{/* Destination Input */}
				<div style={{ flex: 1, width: isMobile ? '100%' : 'auto' }}>
					<label style={{ 
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
						marginBottom: '8px', 
						fontWeight: '600', 
						fontSize: isMobile ? '0.9rem' : '1rem',
						color: isDarkMode ? '#e8eaed' : '#333' 
					}}>
						<FaPlaneArrival style={{ color: '#10b981', fontSize: '1rem' }} />
						<span>Traveling To</span>
					</label>
					<input
						type="text"
						value={destinationLocation ? `${destinationLocation.name}, ${destinationLocation.country}` : typedDestination}
						onChange={(e) => onDestinationChange(e.target.value)}
						placeholder={isMobile ? "Destination..." : "Type city or click on globe..."}
						style={{
							width: '100%',
							padding: isMobile ? '12px 14px' : '14px 16px',
							border: `2px solid ${isDarkMode ? 'rgba(118, 75, 162, 0.5)' : 'rgba(118, 75, 162, 0.5)'}`,
							borderRadius: isMobile ? '10px' : '12px',
							fontSize: '16px',
							minHeight: isMobile ? '48px' : 'auto',
							backgroundColor: isDarkMode ? '#1a1f2e' : '#ffffff',
							color: isDarkMode ? '#e8eaed' : '#000',
							outline: 'none',
							transition: 'all 0.3s',
							touchAction: 'manipulation'
						}}
					/>
				</div>
			</div>
			
			{/* Action Buttons */}
			<div style={{ 
				marginBottom: isMobile ? '16px' : '20px', 
				textAlign: 'center', 
				display: 'flex', 
				gap: isMobile ? '8px' : '10px', 
				justifyContent: 'center', 
				flexWrap: 'wrap' 
			}}>
				{/* Show Route Button (for typed inputs) */}
				{(typedSource.trim() || typedDestination.trim()) && !routeData && (
					<button
						type="button"
						onClick={onShowRoute}
						disabled={!typedSource.trim() || !typedDestination.trim() || loadingRoute}
						style={{
							padding: isMobile ? '10px 20px' : '12px 28px',
							background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
							color: 'white',
							border: 'none',
							borderRadius: isMobile ? '8px' : '8px',
							fontSize: isMobile ? '14px' : '15px',
							fontWeight: '600',
							minHeight: isMobile ? '44px' : 'auto',
							cursor: (!typedSource.trim() || !typedDestination.trim() || loadingRoute) ? 'not-allowed' : 'pointer',
							transition: 'all 0.3s',
							opacity: (!typedSource.trim() || !typedDestination.trim() || loadingRoute) ? 0.5 : 1,
							touchAction: 'manipulation'
						}}
					>
						<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
							<FaGlobeAmericas />
							<span>Show Route on Globe</span>
						</span>
					</button>
				)}
				
				{/* Reset Button */}
				{(sourceDestination || destinationLocation || typedSource || typedDestination) && (
					<button
						type="button"
						onClick={onReset}
						style={{
							padding: isMobile ? '10px 20px' : '12px 24px',
							background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
							color: isDarkMode ? '#e8eaed' : '#374151',
							border: 'none',
							borderRadius: '8px',
							fontSize: isMobile ? '13px' : '14px',
							fontWeight: '600',
							minHeight: isMobile ? '44px' : 'auto',
							cursor: 'pointer',
							transition: 'all 0.3s',
							touchAction: 'manipulation'
						}}
					>
						<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
							<FaRedo />
							<span>Reset Selection</span>
						</span>
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
					<FaPlane style={{ fontSize: '1.5rem', color: '#10b981' }} />
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
