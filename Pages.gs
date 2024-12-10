// Pages.gs - Handles rendering of dynamic pages

// Global variable for desired headers
const desiredHeaders = [
  'WL Name', 'Individual ID', 'SEA Member Type', 'Last First Middle Name',
  'Home Phone Number', 'Mobile Phone Number', 'Home Email', 'Other Email', 'Work Email'
];

/**
 * Dynamically renders content for a given page.
 */
function getPageContent(page) {
  try {
    switch (page) {
      case 'currentRoster':
        return renderCurrentRoster();
      case 'proposedChanges':
        return renderPageWithSelectedHeaders('ProposedChanges', 'Proposed Changes');
      case 'archivedMembers':
        return renderPageWithSelectedHeaders('ArchivedMembers', 'Archived Members');
      case 'upload':
        return renderUploadPage();
      case 'errorLog':
        return renderErrorLog();
      default:
        throw new Error(`Invalid page requested: ${page}`);
    }
  } catch (error) {
    Logger.log(`Error in getPageContent for page: ${page}, Error: ${error.message}`);
    return `<h1>Error</h1><p>Could not load content for ${page}. Check logs for details.</p>`;
  }
}

/**
 * Renders the Current Roster page with filtering capabilities.
 */
function renderCurrentRoster() {
  try {
    const data = Utilities.getRosterData();
    if (!data || data.length === 0) {
      return `<h1>Current Roster</h1><p>No data available.</p>`;
    }

    // Fetch unique values for filters
    const wlNames = getUniqueValues('Roster', 'WL Name');
    const seaMemberTypes = getUniqueValues('Roster', 'SEA Member Type');

    if (!wlNames || !seaMemberTypes) {
      throw new Error('Unable to fetch unique values for filters.');
    }

    // Generate dropdowns for filters
    const filterControls = `
      <label for="wlNameFilter">WL Name:</label>
      <select id="wlNameFilter">
        <option value="">All</option>
        ${wlNames.map(wl => `<option value="${wl}">${wl}</option>`).join('')}
      </select>

      <label for="seaMemberTypeFilter">SEA Member Type:</label>
      <select id="seaMemberTypeFilter">
        <option value="">All</option>
        ${seaMemberTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
      </select>

      <button onclick="applyFilters()">Apply Filters</button>
    `;

    // Filter data by headers
    const filteredData = Utilities.filterDataByHeaders(data, desiredHeaders);
    if (!filteredData || filteredData.length === 0) {
      return `<h1>Current Roster</h1>${filterControls}<p>No data available for the selected headers.</p>`;
    }

    // Render the table
    const title = `<h1 style="text-align: center;">Current Roster</h1>`;
    const tableHtml = Utilities.createTableHtml(filteredData);

    return `${title}${filterControls}${tableHtml}`;
  } catch (error) {
    Logger.log('Error in renderCurrentRoster: ' + error.message + ', Stack: ' + error.stack);
    return `<h1>Error</h1><p>Could not load roster data. Check the logs for details.</p>`;
  }
}

/**
 * Renders the filtered Current Roster table based on user-selected filters.
 */
function filterCurrentRoster(wlName, seaMemberType) {
  try {
    const data = Utilities.getRosterData();
    if (!data || data.length === 0) {
      return `<h1>Current Roster</h1><p>No data available.</p>`;
    }

    // Fetch unique values for filters
    const wlNames = getUniqueValues('Roster', 'WL Name');
    const seaMemberTypes = getUniqueValues('Roster', 'SEA Member Type');

    // Generate dropdowns for filters
    const filterControls = `
      <label for="wlNameFilter">WL Name:</label>
      <select id="wlNameFilter">
        <option value="">All</option>
        ${wlNames.map(wl => `<option value="${wl}" ${wl === wlName ? 'selected' : ''}>${wl}</option>`).join('')}
      </select>

      <label for="seaMemberTypeFilter">SEA Member Type:</label>
      <select id="seaMemberTypeFilter">
        <option value="">All</option>
        ${seaMemberTypes.map(type => `<option value="${type}" ${type === seaMemberType ? 'selected' : ''}>${type}</option>`).join('')}
      </select>

      <button onclick="applyFilters()">Apply Filters</button>
    `;

    // Filter rows based on WL Name and SEA Member Type
    const filteredRows = data.slice(1).filter(row => {
      const wlNameMatch = !wlName || row[data[0].indexOf('WL Name')] === wlName;
      const seaMemberTypeMatch = !seaMemberType || row[data[0].indexOf('SEA Member Type')] === seaMemberType;
      return wlNameMatch && seaMemberTypeMatch;
    });

    // Include only desired columns
    const filteredData = Utilities.filterDataByHeaders([data[0], ...filteredRows], desiredHeaders);

    // Render the filtered table
    const title = `<h1 style="text-align: center;">Current Roster</h1>`;
    const tableHtml = Utilities.createTableHtml(filteredData);

    return `${title}${filterControls}${tableHtml}`;
  } catch (error) {
    Logger.log('Error in filterCurrentRoster: ' + error.message);
    return `<h1>Error</h1><p>Could not apply filters. Check the logs for details.</p>`;
  }
}

/**
 * Renders a generic page with selected headers.
 */
function renderPageWithSelectedHeaders(sheetName, pageTitle) {
  try {
    if (!sheetName) {
      throw new Error('Invalid sheetName provided.');
    }

    const data = Utilities.readSheet(sheetName);
    const title = `<h1 style="text-align: center;">${pageTitle}</h1>`;
    if (!data || data.length === 0) {
      return `${title}<p>No data available.</p>`;
    }

    // Filter data by headers
    const filteredData = Utilities.filterDataByHeaders(data, desiredHeaders);

    // Render the filtered data as a table
    return `${title}${Utilities.createTableHtml(filteredData)}`;
  } catch (error) {
    Logger.log(`Error in renderPageWithSelectedHeaders for sheet: "${sheetName}", Error: ${error.message}`);
    return `<h1>Error</h1><p>Could not load data for ${pageTitle}. Check logs for details.</p>`;
  }
}

/**
 * Fetches unique values for a specific column in a sheet.
 */
function getUniqueValues(sheetName, columnName) {
  try {
    if (!sheetName) {
      throw new Error('Invalid sheetName provided to getUniqueValues.');
    }

    const data = Utilities.readSheet(sheetName);
    if (!data || data.length === 0) {
      throw new Error(`Sheet "${sheetName}" is empty or not found.`);
    }

    const headers = data[0];
    if (!headers || headers.length === 0) {
      throw new Error(`No headers found in sheet "${sheetName}".`);
    }

    const columnIndex = headers.indexOf(columnName);
    if (columnIndex === -1) {
      throw new Error(`Column "${columnName}" not found in sheet "${sheetName}".`);
    }

    return [...new Set(data.slice(1).map(row => row[columnIndex]))].filter(Boolean);
  } catch (error) {
    Logger.log(`Error in getUniqueValues for sheet "${sheetName}", column "${columnName}": ${error.message}`);
    return [];
  }
}

/**
 * Renders the Upload New Roster page.
 */
function renderUploadPage() {
  const title = `<h1 style="text-align: center;">Upload New Roster</h1>`;
  return `
    ${title}
    <form id="uploadForm">
      <input type="file" id="fileInput" accept=".csv, .xlsx">
      <button type="button" onclick="uploadFile()">Upload</button>
    </form>
    <script>
      function applyFilters() {
        const wlName = document.getElementById('wlNameFilter').value;
        const seaMemberType = document.getElementById('seaMemberTypeFilter').value;

        google.script.run.withSuccessHandler(displayContent).filterCurrentRoster(wlName, seaMemberType);
      }
    </script>
  `;
}

/**
 * Renders the Error Log page.
 */
function renderErrorLog() {
  const data = Utilities.readSheet('Error Log');
  const title = `<h1 style="text-align: center;">Error Log</h1>`;
  if (!data || data.length === 0) {
    return `${title}<p>No errors logged.</p>`;
  }
  return `${title}${Utilities.createTableHtml(data)}`;
}
