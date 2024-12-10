// Workflow.gs - Handles roster comparison and approval workflows

/**
 * Compare Roster and New Roster sheets to identify Adds, Updates, and Deletes.
 * Logs the proposed changes in the ProposedChanges sheet.
 */
function compareSheets() {
  try {
    const currentRoster = Utilities.getRosterData(); // Roster sheet
    const newRoster = Utilities.readSheet('New Roster'); // New Roster sheet

    // Debugging logs
    Logger.log('Raw Current Roster Data: ' + JSON.stringify(currentRoster));
    Logger.log('Raw New Roster Data: ' + JSON.stringify(newRoster));

    // Validate data
    if (!currentRoster || currentRoster.length <= 1) {
      throw new Error('No data detected in the Roster sheet or only headers present.');
    }
    if (!newRoster || newRoster.length <= 1) {
      throw new Error('No data detected in the New Roster sheet or only headers present.');
    }

    // Extract headers
    const headers = currentRoster[0];
    Logger.log('Headers: ' + JSON.stringify(headers));

    const currentData = normalizeData(currentRoster.slice(1), headers); // Exclude headers
    const newData = normalizeData(newRoster.slice(1), headers); // Exclude headers

    Logger.log('Normalized Current Data: ' + JSON.stringify(currentData));
    Logger.log('Normalized New Data: ' + JSON.stringify(newData));

    const proposedChanges = [];

    // Create sets of Individual IDs for comparison
    const currentIds = new Set(currentData.map(row => row['Individual ID']));
    const newIds = new Set(newData.map(row => row['Individual ID']));

    // Identify Adds
    for (const row of newData) {
      if (!currentIds.has(row['Individual ID'])) {
        proposedChanges.push({ action: 'Add', data: row });
      }
    }

    // Identify Deletes
    for (const row of currentData) {
      if (!newIds.has(row['Individual ID'])) {
        proposedChanges.push({ action: 'Delete', data: row });
      }
    }

    // Identify Updates
    for (const newRow of newData) {
      const matchingRow = currentData.find(row => row['Individual ID'] === newRow['Individual ID']);
      if (matchingRow && JSON.stringify(matchingRow) !== JSON.stringify(newRow)) {
        proposedChanges.push({ action: 'Update', data: newRow });
      }
    }

    Logger.log('Proposed Changes: ' + JSON.stringify(proposedChanges));

    // Write Proposed Changes to the ProposedChanges sheet
    const proposedChangesSheetData = [
      ['Action', 'Approval Status', ...headers], // Updated headers
      ...proposedChanges.map(change => [
        change.action,
        'Pending', // Initial status
        ...Object.values(change.data)
      ])
    ];

    Utilities.writeSheet('ProposedChanges', proposedChangesSheetData);
  } catch (error) {
    ErrorLog.logError('compareSheets', error.message);
    Logger.log('Error in compareSheets: ' + error.message);
  }
}

/**
 * Process approved actions in the ProposedChanges sheet.
 * Executes Adds, Updates, and Deletes on respective sheets.
 */
function processApprovals() {
  try {
    const proposedChanges = Utilities.readSheet('ProposedChanges');
    if (!proposedChanges || proposedChanges.length === 0) {
      throw new Error('No data detected in the ProposedChanges sheet.');
    }

    Logger.log('Proposed Changes Data: ' + JSON.stringify(proposedChanges));

    const headers = proposedChanges[0];
    const rows = proposedChanges.slice(1); // Exclude headers

    // Separate approved rows
    const approvedRows = rows.filter(row => row[headers.indexOf('Approval Status')] === 'Approved');

    const rosterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Roster');
    const archivedSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ArchivedMembers');

    for (const row of approvedRows) {
      const action = row[headers.indexOf('Action')];
      const data = row.slice(2); // Exclude Action and Approval Status

      switch (action) {
        case 'Add':
          rosterSheet.appendRow(data);
          break;
        case 'Update':
          const individualId = data[headers.indexOf('Individual ID')];
          const rosterData = rosterSheet.getDataRange().getValues();
          const updateIndex = rosterData.findIndex(r => r[headers.indexOf('Individual ID')] === individualId);
          if (updateIndex > 0) {
            rosterSheet.getRange(updateIndex + 1, 1, 1, data.length).setValues([data]);
          }
          break;
        case 'Delete':
          archivedSheet.appendRow([new Date().toISOString(), 'No reason provided', ...data]); // Archived Date added
          break;
      }
    }

    // Retain only Pending and Denied rows in ProposedChanges
    const pendingRows = rows.filter(row => row[headers.indexOf('Approval Status')] !== 'Approved');
    Utilities.writeSheet('ProposedChanges', [headers, ...pendingRows]);
  } catch (error) {
    ErrorLog.logError('processApprovals', error.message);
    Logger.log('Error in processApprovals: ' + error.message);
  }
}

/**
 * Splits the "Last First Middle Name" column into "Last Name", "First Name", and "Middle Name".
 */
function splitLastFirstMiddleName() {
  const sheetName = 'Roster';
  const columnName = 'Last First Middle Name';
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found.`);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const columnIndex = headers.indexOf(columnName);

  if (columnIndex === -1) {
    throw new Error(`Column "${columnName}" not found.`);
  }

  // Insert new columns for Last Name, First Name, and Middle Name (after the original column)
  sheet.insertColumnsAfter(columnIndex + 1, 3); // Insert three new columns
  sheet.getRange(1, columnIndex + 2).setValue('Last Name');
  sheet.getRange(1, columnIndex + 3).setValue('First Name');
  sheet.getRange(1, columnIndex + 4).setValue('Middle Name');

  // Process each row of data
  for (let i = 1; i < data.length; i++) { // Skip header row
    const cell = data[i][columnIndex] ? data[i][columnIndex].trim() : ''; // Trim the original cell value
    if (!cell) {
      // If the cell is empty, leave the new columns blank
      sheet.getRange(i + 1, columnIndex + 2, 1, 3).setValues([['', '', '']]);
      continue;
    }

    // Split the cell at the first space
    const parts = cell.split(' ');
    const lastName = parts[0] || ''; // Last Name
    const firstName = parts[1] || ''; // First Name
    const middleName = parts.slice(2).join(' ').trim(); // Middle Name (remaining parts)

    // Write the split values into the new columns
    sheet.getRange(i + 1, columnIndex + 2, 1, 3).setValues([[lastName, firstName, middleName]]);
  }

  // The original "Last First Middle Name" column is retained.
}



/**
 * Normalize data for comparison by trimming whitespace and mapping headers to values.
 * @param {Array} data - Two-dimensional array of rows (excluding headers).
 * @param {Array} headers - Array of header names.
 * @returns {Array} Array of objects with headers as keys.
 */
function normalizeData(data, headers) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    Logger.log('Invalid or empty data detected in normalizeData: ' + JSON.stringify(data));
    throw new Error('Invalid data: Expected a non-empty two-dimensional array.');
  }

  return data
    .filter(row => row.some(cell => cell && cell.toString().trim() !== '')) // Ignore blank rows
    .map(row => {
      if (!row || !Array.isArray(row)) {
        Logger.log('Invalid row detected: ' + JSON.stringify(row));
        throw new Error('Invalid row: Each row should be an array.');
      }
      return row.reduce((obj, value, index) => {
        // Ensure value is a string before applying .trim()
        const cellValue = value != null ? value.toString().trim() : ''; // Handle null/undefined and trim
        obj[headers[index]] = cellValue !== "(none)" ? cellValue : ''; // Replace "(none)" with empty string
        return obj;
      }, {});
    });
}
