document.addEventListener('DOMContentLoaded', function() {
    const loginButton = document.getElementById('loginButton');
    const userInfo = document.getElementById('userInfo');
    const avatar = document.getElementById('avatar');
    const displayName = document.getElementById('displayName');
  
    // Check if user is already logged in
    chrome.storage.sync.get(['displayName', 'avatarUrl'], function(result) {
      if (result.displayName && result.avatarUrl) {
        showUserInfo(result.displayName, result.avatarUrl);
      }
    });
  
    loginButton.addEventListener('click', function() {
      chrome.runtime.sendMessage({action: 'login'});
    });
  
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.action === 'loginSuccess') {
        showUserInfo(request.displayName, request.avatarUrl);
      }
    });
  
    function showUserInfo(name, avatarUrl) {
      loginButton.style.display = 'none';
      userInfo.style.display = 'block';
      avatar.src = avatarUrl;
      displayName.textContent = name;
    }
  });