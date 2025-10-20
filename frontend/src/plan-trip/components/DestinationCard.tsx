import React from 'react';
import { Destination } from '../../data/destinations';

interface DestinationCardProps {
	destination: Destination;
	isMobile: boolean;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({ destination, isMobile }) => {
	return (
		<div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)', border: '1px solid rgba(255,255,255,0.2)' }}>
			<div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
				<span style={{ fontSize: '1.5rem' }}>📍</span>
				<span>{destination.name}, {destination.country}</span>
			</div>
			<div style={{ opacity: 0.9, fontSize: '0.95rem', marginBottom: '12px' }}>
				{destination.description}
			</div>
			<div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '0.9rem', flexWrap: 'wrap' }}>
				<div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
					<span>💰</span>
					<span>{destination.averageCost}</span>
				</div>
				<div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
					<span>🏷️</span>
					<span style={{ textTransform: 'capitalize' }}>{destination.category}</span>
				</div>
				<div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
					<span>📅</span>
					<span>Best: {destination.bestMonths.slice(0, 2).join(', ')}</span>
				</div>
			</div>
		</div>
	);
};
