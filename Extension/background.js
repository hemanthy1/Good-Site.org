  function loginWithTikTok() {
    const authUrl = 'https://good-site.org/auth/tiktok';
    // chrome.tabs.create({ url: authUrl }, function (tab) {
    //   chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
    //     if (tabId === tab.id && info.url && info.url.includes('/profile')) {
    //       chrome.tabs.onUpdated.removeListener(listener);
    //       chrome.tabs.remove(tabId);
    //       fetchUserInfo();
    //     }
    //   });
    // });

    chrome.identity.launchWebAuthFlow(
        {
          url: 'https://www.good-site.org/auth/tiktok',
          interactive: true
        },
        function (redirectUrl) {
        //   if (chrome.runtime.lastError) {
        //     console.error(chrome.runtime.lastError);
        //     return;
        //   }
          console.error('redirect url:', redirectUrl);

          const urlParams = new URLSearchParams(redirectUrl.split('?')[1]);
          const avatarUrl = decodeURIComponent(urlParams.get('avatar_url'));

          const displayName = decodeURIComponent(urlParams.get('display_name'));
          console.error('Display name:', displayName);
          if (displayName && avatarUrl) {
            // Store the user info in Chrome storage
            chrome.storage.local.set(
              { displayName: displayName, avatarUrl: avatarUrl },
              function () {
                console.log('User info stored');
                chrome.runtime.sendMessage({ action: 'userInfoUpdated' });
              }
            );

            if(!displayName || !avatarUrl) {
                console.error(chrome.runtime.lastError);
                return;
            }

            chrome.tabs.query({ url: redirectUrl }, function (tabs) {
                if (tabs.length > 0) {
                  chrome.tabs.remove(tabs[0].id);
                }
              });

          } else {
            console.error('Display name or avatar URL not found in the redirect URL');
          }
        })
  }
  
//   function exchangeCodeForToken(authorizationCode) {
//     const tokenUrl = 'https://good-site.org/auth/tiktok/callback';
//     const requestBody = {
//       code: authorizationCode,
//       client_secret: 'your_client_secret',
//       client_key: 'your_client_key',
//       grant_type: 'authorization_code',
//     };
  
//     fetch(tokenUrl, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(requestBody),
//     })
//       .then((response) => response.json())
//       .then((data) => {
//         const accessToken = data.access_token;
//         // Store the access token in Chrome storage
//         chrome.storage.local.set({ accessToken: accessToken }, function () {
//           console.log('Access token stored');
//           // Retrieve the user's display name and avatar URL
//           fetchUserInfo(accessToken);
//         });
//       })
//       .catch((error) => {
//         console.error('Error exchanging authorization code for access token:', error);
//       });
//   }
  
  function fetchUserInfo() {
    const userInfoUrl = 'https://good-site.org/profile';
    fetch(userInfoUrl, {
      credentials: 'include',
    })
      .then((response) => response.text())
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const displayName = doc.querySelector('#display-name').textContent;
        const avatarUrl = doc.querySelector('#avatar').getAttribute('src');
        // Store the user info in Chrome storage
        chrome.storage.local.set(
          { displayName: displayName, avatarUrl: avatarUrl },
          function () {
            console.log('User info stored');
            chrome.runtime.sendMessage({ action: 'userInfoUpdated'});

            // TODO: Update the UI with the user info
          }
        );
      })
      .catch((error) => {
        console.error('Error fetching user info:', error);
      });
  }

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'login') {
      // Initiate the login process
      loginWithTikTok();
    }
  });