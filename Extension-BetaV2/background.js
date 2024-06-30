async function getUserInfoFromTab(url) {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const displayName = urlParams.get('display_name');
    const avatarUrl = urlParams.get('avatar_url');
    chrome.storage.local.set(
        { displayName: displayName, avatarUrl: avatarUrl },
        function () {
            console.log('User info stored');
        }
    );
}


async function tiktokAuth() {
    try {
        chrome.tabs.create({ url: 'https://good-site.org/auth/tiktok' }, (tab) => {
            console.log('Tab created');
            chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, updatedTab) => {

                if (updatedTab.url.startsWith('https://www.good-site.org/profile')) {
                    console.log('Tab updated to profile tab');

                    const userInfo = await getUserInfoFromTab(updatedTab.url);
                    chrome.storage.local.get(['displayName'], function (data) {
                        if (data.displayName) {
                            // User is logged in, update the UI
                            console.log('User is logged in!!');
                            console.log('User Info:', data.displayName);
                        }
                    });
                    chrome.tabs.get(tabId, (tab) => {
                        if (chrome.runtime.lastError) {
                            console.warn('Tab not found:', chrome.runtime.lastError.message);
                        } else {
                            chrome.tabs.remove(tabId, () => {
                                if (chrome.runtime.lastError) {
                                    console.warn('Error removing tab:', chrome.runtime.lastError.message);
                                } else {
                                    console.log('Tab removed successfully');
                                }
                            });
                        }
                    });
                }
            });
        });
    }

    catch (e) {
        console.warn('Error:', e);
    }
}

chrome.action.onClicked.addListener(() => {
    chrome.storage.local.get(['displayName'], function (data) {
        if (!data.displayName) {
            tiktokAuth();
            console.log('User is NOT logged in');
        }
    });

});