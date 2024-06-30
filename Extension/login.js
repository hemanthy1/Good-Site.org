function loginWithTikTok() {
    const authUrl = 'https://good-site.org/auth/tiktok';
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      function (redirectUrl) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          return;
        }
        // Extract the access token from the redirect URL
        const accessToken = redirectUrl.substring(redirectUrl.indexOf('=') + 1);
        // Store the access token in Chrome storage
        chrome.storage.local.set({ accessToken: accessToken }, function () {
          console.log('Access token stored');
          // Retrieve the user's display name and avatar URL
          fetchUserInfo(accessToken);
        });
      }
    );
  }
  
  function fetchUserInfo(accessToken) {
    const userInfoUrl = 'https://good-site.org/profile';
    fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        const { display_name, avatar_url } = data;
        // Store the user info in Chrome storage
        chrome.storage.local.set(
          { displayName: display_name, avatarUrl: avatar_url },
          function () {
            console.log('User info stored');
            // TODO: Update the UI with the user info
          }
        );
      })
      .catch((error) => {
        console.error('Error fetching user info:', error);
      });
  }