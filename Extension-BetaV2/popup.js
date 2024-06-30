function updateUserInfo() {
    chrome.storage.local.get(['displayName', 'avatarUrl'], function(data) {
        const userInfoDiv = document.getElementById('user-info');
        const loginMessage = document.getElementById('login-message');
        const displayNameElement = document.getElementById('display-name');
        const avatarElement = document.getElementById('avatar');

        if (data.displayName && data.avatarUrl) {
            displayNameElement.textContent = data.displayName;
            avatarElement.src = data.avatarUrl;
            userInfoDiv.style.display = 'flex';
            loginMessage.style.display = 'none';
        } else {
            userInfoDiv.style.display = 'none';
            loginMessage.style.display = 'block';
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === "userLoggedIn") {
            updateUserInfo();
        }
    });
});