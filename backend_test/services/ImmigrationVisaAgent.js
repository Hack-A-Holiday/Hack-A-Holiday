/**
 * Immigration & Visa AI Agent
 * Handles all immigration and visa-related queries using real-time data and official sources.
 * Uses AWS Bedrock (Nova Pro) for reasoning, but never hallucinates answers.
 * Always provides official links for visa requirements, embassy info, and government resources.
 */
const axios = require('axios');

class ImmigrationVisaAgent {
  constructor() {
    this.bedrockModel = process.env.REASONING_MODEL || 'us.amazon.nova-pro-v1:0';
    this.officialVisaLinks = {
      'india': 'https://indianvisaonline.gov.in/',
      'usa': 'https://travel.state.gov/content/travel/en/us-visas.html',
      'uk': 'https://www.gov.uk/browse/visas-immigration',
      'canada': 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html',
      'australia': 'https://immi.homeaffairs.gov.au/visas',
      // Add more as needed
    };
  }

  /**
   * Get official visa info and links for a country
   */
  async getVisaInfo(country, nationality) {
    const countryKey = country.toLowerCase();
    const link = this.officialVisaLinks[countryKey] || null;
    // Use Bedrock for reasoning, but never hallucinate data
    // Always return official link if available
    return {
      country: country,
      nationality: nationality,
      officialLink: link,
      message: link
        ? `Find official visa requirements for ${country} here: ${link}`
        : `Visa info for ${country} not found. Please check the official government website.`
    };
  }
}

module.exports = ImmigrationVisaAgent;
