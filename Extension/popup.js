document.addEventListener('DOMContentLoaded', function () {
    const loginButton = document.getElementById('login-button');
    const userInfoElement = document.getElementById('user-info');
    const userNameElement = document.getElementById('user-name');
  
    // Check if the user is already logged in
    chrome.storage.local.get(['displayName'], function (data) {
      if (data.displayName) {
        // User is logged in, update the UI
        loginButton.style.display = 'none';
        userInfoElement.style.display = 'block';
        userNameElement.textContent = data.displayName;
      }
    });
  
    loginButton.addEventListener('click', function () {
      // Initiate the login process
      chrome.runtime.sendMessage({ action: 'login' });
    });
  
    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      if (request.action === 'userInfoUpdated') {
        chrome.storage.local.get(['displayName'], function (data) {
            if (data.displayName) {
              // Update the UI with the user's name
              const userNameElement = document.getElementById('user-name');
              userNameElement.textContent = data.displayName;
              const userInfoElement = document.getElementById('user-info');
              userInfoElement.style.display = 'block';
              const loginButton = document.getElementById('login-button');
              loginButton.style.display = 'none';
            }
          });
      }
    });
  });