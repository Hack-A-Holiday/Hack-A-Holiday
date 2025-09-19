import { Itinerary, DayPlan, FlightOption, HotelOption } from '../types';
import { formatCurrency, formatDate } from './calculations';

/**
 * Generate PDF content for itinerary
 * Note: This is a simplified HTML-to-PDF approach
 * In production, you might want to use libraries like puppeteer, jsPDF, or PDFKit
 */
export class PDFGenerator {
  /**
   * Generate HTML content that can be converted to PDF
   */
  static generateItineraryHTML(itinerary: Itinerary): string {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Travel Itinerary - ${itinerary.destination}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #2563eb;
            margin: 0;
            font-size: 2.5em;
        }
        .header .subtitle {
            color: #666;
            font-size: 1.2em;
            margin-top: 10px;
        }
        .summary {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-item .label {
            font-weight: bold;
            color: #374151;
            display: block;
            margin-bottom: 5px;
        }
        .summary-item .value {
            font-size: 1.1em;
            color: #2563eb;
        }
        .section {
            margin-bottom: 40px;
        }
        .section h2 {
            color: #1f2937;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .flight-card, .hotel-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .flight-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .flight-route {
            font-size: 1.2em;
            font-weight: bold;
            color: #1f2937;
        }
        .flight-price {
            font-size: 1.3em;
            font-weight: bold;
            color: #059669;
        }
        .flight-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            color: #6b7280;
        }
        .day-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .day-header {
            background: #2563eb;
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }
        .day-title {
            font-size: 1.3em;
            font-weight: bold;
            margin: 0;
        }
        .day-date {
            opacity: 0.9;
            margin-top: 5px;
        }
        .activity-list {
            margin-bottom: 20px;
        }
        .activity-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        .activity-item:last-child {
            border-bottom: none;
        }
        .activity-name {
            font-weight: 500;
            color: #1f2937;
        }
        .activity-details {
            color: #6b7280;
            font-size: 0.9em;
        }
        .activity-price {
            font-weight: bold;
            color: #059669;
        }
        .budget-breakdown {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }
        .budget-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        .budget-item {
            text-align: center;
            padding: 10px;
            background: white;
            border-radius: 6px;
        }
        .budget-label {
            font-size: 0.9em;
            color: #6b7280;
            margin-bottom: 5px;
        }
        .budget-amount {
            font-size: 1.1em;
            font-weight: bold;
            color: #1f2937;
        }
        .total-cost {
            text-align: center;
            font-size: 1.5em;
            font-weight: bold;
            color: #2563eb;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
        }
        @media print {
            body { margin: 0; }
            .day-card { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Travel Itinerary</h1>
        <div class="subtitle">${itinerary.destination}</div>
        <div class="subtitle">${formatDate(itinerary.startDate, 'long')} - ${formatDate(itinerary.endDate, 'long')}</div>
    </div>

    <div class="summary">
        <div class="summary-grid">
            <div class="summary-item">
                <span class="label">Destination</span>
                <span class="value">${itinerary.destination}</span>
            </div>
            <div class="summary-item">
                <span class="label">Duration</span>
                <span class="value">${itinerary.days.length} days</span>
            </div>
            <div class="summary-item">
                <span class="label">Total Cost</span>
                <span class="value">${formatCurrency(itinerary.totalCost)}</span>
            </div>
            <div class="summary-item">
                <span class="label">Status</span>
                <span class="value">${itinerary.status.charAt(0).toUpperCase() + itinerary.status.slice(1)}</span>
            </div>
        </div>
    </div>

    ${this.generateFlightsSection(itinerary.flights)}
    ${this.generateHotelsSection(itinerary.hotels)}
    ${this.generateDailyItinerarySection(itinerary.days)}
    ${this.generateBudgetBreakdownSection(itinerary.budgetBreakdown, itinerary.totalCost)}

    <div style="text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em;">
        Generated by Autonomous Travel Companion on ${formatDate(new Date().toISOString(), 'long')}
    </div>
</body>
</html>`;

    return html;
  }

  private static generateFlightsSection(flights: { outbound: FlightOption; return: FlightOption }): string {
    if (!flights.outbound && !flights.return) return '';

    return `
    <div class="section">
        <h2>✈️ Flights</h2>
        ${flights.outbound ? this.generateFlightCard('Outbound Flight', flights.outbound) : ''}
        ${flights.return ? this.generateFlightCard('Return Flight', flights.return) : ''}
    </div>`;
  }

  private static generateFlightCard(title: string, flight: FlightOption): string {
    return `
    <div class="flight-card">
        <div class="flight-header">
            <div>
                <div style="font-size: 1.1em; color: #6b7280; margin-bottom: 5px;">${title}</div>
                <div class="flight-route">${flight.departure.city} → ${flight.arrival.city}</div>
            </div>
            <div class="flight-price">${formatCurrency(flight.price)}</div>
        </div>
        <div class="flight-details">
            <div><strong>Flight:</strong> ${flight.airline} ${flight.flightNumber}</div>
            <div><strong>Departure:</strong> ${flight.departure.time} (${flight.departure.airport})</div>
            <div><strong>Arrival:</strong> ${flight.arrival.time} (${flight.arrival.airport})</div>
            <div><strong>Duration:</strong> ${flight.duration}</div>
            <div><strong>Stops:</strong> ${flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</div>
        </div>
    </div>`;
  }

  private static generateHotelsSection(hotels: HotelOption[]): string {
    if (!hotels || hotels.length === 0) return '';

    return `
    <div class="section">
        <h2>🏨 Accommodation</h2>
        ${hotels.map(hotel => this.generateHotelCard(hotel)).join('')}
    </div>`;
  }

  private static generateHotelCard(hotel: HotelOption): string {
    return `
    <div class="hotel-card">
        <div class="flight-header">
            <div>
                <div class="flight-route">${hotel.name}</div>
                <div style="color: #6b7280; margin-top: 5px;">
                    ${'★'.repeat(hotel.rating)}${'☆'.repeat(5 - hotel.rating)} • ${hotel.address}
                </div>
            </div>
            <div class="flight-price">${formatCurrency(hotel.totalPrice)}</div>
        </div>
        <div class="flight-details">
            <div><strong>Check-in:</strong> ${formatDate(hotel.checkIn)}</div>
            <div><strong>Check-out:</strong> ${formatDate(hotel.checkOut)}</div>
            <div><strong>Room Type:</strong> ${hotel.roomType}</div>
            <div><strong>Per Night:</strong> ${formatCurrency(hotel.pricePerNight)}</div>
            ${hotel.amenities.length > 0 ? `<div><strong>Amenities:</strong> ${hotel.amenities.join(', ')}</div>` : ''}
        </div>
    </div>`;
  }

  private static generateDailyItinerarySection(days: DayPlan[]): string {
    if (!days || days.length === 0) return '';

    return `
    <div class="section">
        <h2>📅 Daily Itinerary</h2>
        ${days.map(day => this.generateDayCard(day)).join('')}
    </div>`;
  }

  private static generateDayCard(day: DayPlan): string {
    return `
    <div class="day-card">
        <div class="day-header">
            <div class="day-title">Day ${day.dayNumber}</div>
            <div class="day-date">${formatDate(day.date, 'long')}</div>
        </div>

        ${day.activities.length > 0 ? `
        <div class="activity-list">
            <h4 style="margin-bottom: 15px; color: #1f2937;">🎯 Activities</h4>
            ${day.activities.map(activity => `
            <div class="activity-item">
                <div>
                    <div class="activity-name">${activity.name}</div>
                    <div class="activity-details">${activity.duration} • ${activity.category}</div>
                </div>
                <div class="activity-price">${formatCurrency(activity.price)}</div>
            </div>
            `).join('')}
        </div>` : ''}

        ${day.meals.length > 0 ? `
        <div class="activity-list">
            <h4 style="margin-bottom: 15px; color: #1f2937;">🍽️ Meals</h4>
            ${day.meals.map(meal => `
            <div class="activity-item">
                <div>
                    <div class="activity-name">${meal.name}</div>
                    <div class="activity-details">${meal.type} • ${meal.cuisine}</div>
                </div>
                <div class="activity-price">${formatCurrency(meal.estimatedCost)}</div>
            </div>
            `).join('')}
        </div>` : ''}

        ${day.transportation.length > 0 ? `
        <div class="activity-list">
            <h4 style="margin-bottom: 15px; color: #1f2937;">🚗 Transportation</h4>
            ${day.transportation.map(transport => `
            <div class="activity-item">
                <div>
                    <div class="activity-name">${transport.from} → ${transport.to}</div>
                    <div class="activity-details">${transport.type} • ${transport.duration}</div>
                </div>
                <div class="activity-price">${formatCurrency(transport.cost)}</div>
            </div>
            `).join('')}
        </div>` : ''}

        <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <strong>Day Total: ${formatCurrency(day.totalCost)}</strong>
        </div>
    </div>`;
  }

  private static generateBudgetBreakdownSection(
    budgetBreakdown: any,
    totalCost: number
  ): string {
    return `
    <div class="budget-breakdown">
        <h2 style="text-align: center; margin-bottom: 20px;">💰 Budget Breakdown</h2>
        <div class="budget-grid">
            <div class="budget-item">
                <div class="budget-label">Flights</div>
                <div class="budget-amount">${formatCurrency(budgetBreakdown.flights)}</div>
            </div>
            <div class="budget-item">
                <div class="budget-label">Accommodation</div>
                <div class="budget-amount">${formatCurrency(budgetBreakdown.accommodation)}</div>
            </div>
            <div class="budget-item">
                <div class="budget-label">Activities</div>
                <div class="budget-amount">${formatCurrency(budgetBreakdown.activities)}</div>
            </div>
            <div class="budget-item">
                <div class="budget-label">Meals</div>
                <div class="budget-amount">${formatCurrency(budgetBreakdown.meals)}</div>
            </div>
            <div class="budget-item">
                <div class="budget-label">Transportation</div>
                <div class="budget-amount">${formatCurrency(budgetBreakdown.transportation)}</div>
            </div>
            <div class="budget-item">
                <div class="budget-label">Miscellaneous</div>
                <div class="budget-amount">${formatCurrency(budgetBreakdown.miscellaneous)}</div>
            </div>
        </div>
        <div class="total-cost">
            Total Cost: ${formatCurrency(totalCost)}
        </div>
    </div>`;
  }

  /**
   * Convert HTML to PDF buffer
   * Note: This is a placeholder implementation
   * In production, you would use a library like puppeteer:
   * 
   * import puppeteer from 'puppeteer';
   * 
   * static async htmlToPDF(html: string): Promise<Buffer> {
   *   const browser = await puppeteer.launch();
   *   const page = await browser.newPage();
   *   await page.setContent(html);
   *   const pdf = await page.pdf({
   *     format: 'A4',
   *     printBackground: true,
   *     margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
   *   });
   *   await browser.close();
   *   return Buffer.from(pdf);
   * }
   */
  static async htmlToPDF(html: string): Promise<Buffer> {
    // Placeholder implementation - returns HTML as buffer
    // In production, implement actual PDF conversion
    return Buffer.from(html, 'utf-8');
  }

  /**
   * Generate PDF buffer for itinerary
   */
  static async generateItineraryPDF(itinerary: Itinerary): Promise<Buffer> {
    const html = this.generateItineraryHTML(itinerary);
    return await this.htmlToPDF(html);
  }
}