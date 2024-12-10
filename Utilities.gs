// Utilities.gs - Reusable utility functions

const Utilities = {
  readSheet(sheetName) {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      if (!sheet) throw new Error(`Sheet "${sheetName}" not found.`);
      const data = sheet.getDataRange().getValues();
      if (!data || data.length === 0) throw new Error(`No data detected in sheet "${sheetName}".`);
      Logger.log(`Data retrieved from sheet "${sheetName}": ` + JSON.stringify(data));
      return data;
    } catch (error) {
      Logger.log(`Error reading sheet "${sheetName}": ` + error.message);
      ErrorLog.logError('readSheet', error.message, { sheetName });
      return []; // Return an empty array to prevent crashes
    }
  },

  writeSheet(sheetName, data) {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      if (!sheet) throw new Error(`Sheet "${sheetName}" not found.`);
      sheet.clear();
      sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    } catch (error) {
      Logger.log(`Error writing to sheet "${sheetName}": ` + error.message);
      ErrorLog.logError('writeSheet', error.message, { sheetName, data });
    }
  },

  getRosterData() {
    try {
      const data = this.readSheet('Roster');
      if (!data || data.length === 0) throw new Error('No data detected in the Roster sheet.');
      return data;
    } catch (error) {
      ErrorLog.logError('getRosterData', error.message);
      return [];
    }
  },

  filterDataByHeaders(data, desiredHeaders) {
    if (!data || data.length === 0) return [];

    const allHeaders = data[0];
    const selectedIndices = desiredHeaders.map(header => allHeaders.indexOf(header));

    // Log missing headers
    const missingHeaders = desiredHeaders.filter((header, index) => selectedIndices[index] === -1);
    if (missingHeaders.length > 0) {
      Logger.log(`Missing headers: ${missingHeaders.join(', ')}`);
    }

    // Ensure only valid indices are used
    const validSelectedIndices = selectedIndices.filter(index => index !== -1);

    // Filter rows
    const filteredData = data.map(row => validSelectedIndices.map(index => row[index]));

    // Prepend the desired headers to the filtered data
    return [desiredHeaders, ...filteredData.slice(1)];
  },

  createTableHtml(data) {
    if (!data || data.length === 0) {
      return '<p>No data available.</p>';
    }

    const [headers, ...rows] = data;
    let html = `
      <table border="1" style="
        border-collapse:collapse;
        width:100%;
        font-size:12px;
        table-layout:auto;
      ">
    `;

    html += '<thead><tr>';
    headers.forEach(header => {
      html += `<th style="
        background-color:#333;
        color:white;
        padding:8px;
        text-align:left;
        white-space:nowrap;
      ">${header}</th>`;
    });
    html += '</tr></thead>';

    html += '<tbody>';
    rows.forEach((row, rowIndex) => {
      const backgroundColor = rowIndex % 2 === 0 ? '#f2f2f2' : '#ffffff';
      html += `<tr style="background-color:${backgroundColor};">`;
      row.forEach(cell => {
        html += `<td style="
          padding:8px;
          border:1px solid #ddd;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        ">${cell}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody>';
    html += '</table>';
    return html;
  }
};
