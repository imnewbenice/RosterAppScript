// Upload.gs - Handles file uploads

function handleUpload(dataUrl) {
  try {
    const base64 = dataUrl.split(',')[1];
    const decoded = Utilities.base64Decode(base64);
    const csvContent = Utilities.newBlob(decoded).getDataAsString();
    const data = Utilities.parseCsv(csvContent);

    if (!data || data.length === 0) {
      throw new Error('Uploaded file is empty or invalid.');
    }

    Utilities.writeSheet('New Roster', data);
    return 'File uploaded successfully.';
  } catch (error) {
    ErrorLog.logError('handleUpload', error.message, { dataUrl });
    return 'File upload failed. Check Error Log for details.';
  }
}
