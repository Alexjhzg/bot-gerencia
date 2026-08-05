import { google } from 'googleapis';
import { config } from '../../config';

let authClientInstance: any = null;

/**
 * Initializes and returns the singleton JWT Auth Client for Google APIs.
 */
export function getAuthClient(): any {
  if (!authClientInstance) {
    try {
      authClientInstance = new google.auth.JWT(
        config.googleEmail,
        undefined,
        config.googlePrivateKey,
        ['https://www.googleapis.com/auth/spreadsheets']
      );
    } catch (error) {
      console.error('Failed to initialize Google Auth JWT client:', error);
      throw error;
    }
  }
  return authClientInstance;
}

/**
 * Returns a configured Google Sheets API v4 client instance.
 */
export function getSheetsClient(): any {
  const auth = getAuthClient();
  return google.sheets({ version: 'v4', auth });
}
