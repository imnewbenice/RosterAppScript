// Code.gs - Main entry point for the web app
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('Roster Management Web App');
}
