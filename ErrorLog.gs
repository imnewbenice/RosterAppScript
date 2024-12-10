// ErrorLog.gs - Manages error logging

const ErrorLog = {
  logError(functionName, errorMessage, context = {}) {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Error Log');
      if (!sheet) throw new Error('Error Log sheet not found.');
      const timestamp = new Date().toISOString();
      const logEntry = [timestamp, functionName, errorMessage, JSON.stringify(context)];
      sheet.appendRow(logEntry);
    } catch (error) {
      Logger.log(`Error logging to Error Log: ${error.message}`);
    }
  }
};
