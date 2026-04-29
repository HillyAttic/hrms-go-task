import { google } from 'googleapis';

export interface FormSubmissionCheck {
  submitted: boolean;
  timestamp?: Date;
  isToday: boolean;
}

export class GoogleSheetsService {
  private sheets;

  constructor(apiKey: string) {
    this.sheets = google.sheets({
      version: 'v4',
      auth: apiKey,
    });
  }

  async checkUserSubmissionToday(
    sheetId: string,
    gid: string,
    userEmail: string,
    emailColumnIndex: number = 1,
    timestampColumnIndex: number = 0
  ): Promise<FormSubmissionCheck> {
    try {
      // Get sheet data
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `'${gid}'!A:Z`, // Read all columns
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return { submitted: false, isToday: false };
      }

      // Get today's date in YYYY-MM-DD format (server timezone)
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Search for user's email and check timestamp
      for (let i = 1; i < rows.length; i++) { // Skip header row
        const row = rows[i];
        const email = row[emailColumnIndex]?.toString().trim().toLowerCase();
        const timestampStr = row[timestampColumnIndex]?.toString();

        if (email === userEmail.toLowerCase()) {
          // Parse timestamp
          let submissionDate: Date | null = null;

          if (timestampStr) {
            // Try parsing different date formats
            submissionDate = new Date(timestampStr);

            // Check if valid date
            if (isNaN(submissionDate.getTime())) {
              submissionDate = null;
            }
          }

          if (submissionDate) {
            // Compare dates (ignore time)
            const submissionDateStr = submissionDate.toISOString().split('T')[0];
            const isToday = submissionDateStr === todayStr;

            return {
              submitted: true,
              timestamp: submissionDate,
              isToday,
            };
          }
        }
      }

      return { submitted: false, isToday: false };
    } catch (error) {
      console.error('Error checking Google Sheets submission:', error);
      throw new Error('Failed to check form submission. Please verify Sheet ID and API key.');
    }
  }
}

export const createGoogleSheetsService = (apiKey: string) => {
  return new GoogleSheetsService(apiKey);
};
