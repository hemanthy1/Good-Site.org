try {
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

  async function getWebsiteName() {
    const queryOptions = { active: true, currentWindow: true };
    const [tab] = await chrome.tabs.query(queryOptions);
    const url = new URL(tab.url);
    let websiteName = url.hostname;

    if (websiteName.startsWith('www.')) {
      websiteName = websiteName.slice(4);
    }

    chrome.storage.local.set({ websiteName: websiteName }, function () {
      console.log('Website name stored', websiteName);
    });
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
                console.log('Tab not found:', chrome.runtime.lastError.message);
              } else {
                chrome.tabs.remove(tabId, () => {
                  if (chrome.runtime.lastError) {
                    console.log('Error removing tab:', chrome.runtime.lastError.message);
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
      console.log('Error:', e);
    }
  };

  function extractPolicyText(html) {
    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Find the main content div
    const contentDiv = tempDiv.querySelector('#content');

    if (contentDiv) {
      // Extract the text content from the relevant elements
      const textDivs = contentDiv.querySelectorAll('div.text');
      let policyText = '';

      textDivs.forEach((div) => {
        policyText += div.innerText + '\n';
      });

      return policyText.trim();
    }

    return '';
  }

  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'summarizePolicies',
      title: 'Summarize Privacy Policy',
      contexts: ['all']
    });
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'summarizePolicies') {
      const policyLinks = await getPolicyLinks(tab.id);
      // console.log('Policy Links:', policyLinks[0])
      const summaries = await summarizePolicies(policyLinks);
      displaySummaries(summaries);
      getWebsiteName();


    }
  });

  async function findPolicyLinks(tabId) {
    const result = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: () => {
        const privacyPolicyRegex = /(privacy policy|privacy statement|privacy notice)/i;
        const termsOfServiceRegex = /(terms of service|terms and conditions|user agreement)/i;

        const links = document.getElementsByTagName('a');
        const policyLinks = {
          privacyPolicy: null,
          termsOfService: null
        };

        for (const link of links) {
          if (privacyPolicyRegex.test(link.textContent) && !policyLinks.privacyPolicy) {
            policyLinks.privacyPolicy = link.href;
          } else if (termsOfServiceRegex.test(link.textContent) && !policyLinks.termsOfService) {
            policyLinks.termsOfService = link.href;
          }

          if (policyLinks.privacyPolicy && policyLinks.termsOfService) {
            break;
          }
        }

        return policyLinks;
      }
    });

    return result[0].result;
  }



  async function getPolicyLinks(tabId) {
    try {
      const policyLinks = await findPolicyLinks(tabId);
      console.log('Policy Links:', policyLinks);
      return policyLinks;
    } catch (error) {
      console.log('Error getting policy links:', error);
      return null;
    }
  }

  async function fetchPolicyContent(url) {
    try {
      const payload = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url })  // Send the URL in the request body
      };
      const response = await fetch('http://good-site.org/api/extract-policy', payload);
      if (!response.ok) {
        console.log(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();  // Assuming the response is JSON
      console.log('Data', data);
      const policyText = data.privacyPolicy;
      console.log('Policy Content:', data.privacyPolicy);
      return policyText;
    } catch (error) {
      console.log('Error fetching policy content:', error);
      return null;
    }

  }

  async function summarizePolicies(policyLinks) {
    const summaries = {};

    for (const [policyType, url] of Object.entries(policyLinks)) {
      if (url && policyType == 'privacyPolicy') {
        const policyContent = await fetchPolicyContent(url);
        console.log('Policy Content:', policyContent);
        const summary = await summarizePolicy(policyContent, policyType);
        summaries[policyType] = summary;
      } else {
        summaries[policyType] = `${policyType} not found.`;
      }
    }

    return summaries;
  }

  async function summarizePolicy(policyContent, policyType) {
    if (!policyContent) {
      return `Unable to summarize ${policyType}. Content not found.`;
    }
    try {
      const openaiApiKey = 'DOWNLOAD FROM GOOD-SITE.ORG TO ACCESS';
      const systemPrompt = `You are a professional html reader and summarizer, skilled in reading Privacy Policies. You will ignore all the unneccessary information not pertaining to the Privacy Policy. Please summarize the Privacy Policy provided by the user in terms of pros and cons. Your response will ALWAYS be in the json format {Pros:[List of Pros in the format {Main Point:Main Point, Description:Description}], Cons:[List of Cons in the format {Main Point:Main Point, Description:Description}]}. `;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },

        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { "type": "json_object" },
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: policyContent
            }
          ],
        })
      });

      const data = await response.json();
      console.log('Summarized Data:', data);
      console.log('Summary:', data.choices[0].message.content);

      return data.choices[0].message.content;
    } catch (error) {
      console.log(`Error summarizing ${policyType}:`, error);
      return `Unable to summarize ${policyType}. An error occurred.`;
    }
  }

  function displaySummaries(summaries) {
    chrome.storage.local.set({ policySummaries: summaries }, () => {
      chrome.action.setPopup({ popup: 'popup.html' });
    });
  }

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'tiktokAuth') {
      tiktokAuth().then(function () {
        chrome.storage.local.get(['displayName', 'avatarUrl'], function (data) {
          sendResponse({
            success: true,
            displayName: data.displayName,
            avatarUrl: data.avatarUrl
          });
        });
      }).catch(function (error) {
        console.log('Error:', error);
        sendResponse({ success: false });
      });
      return true; 
    }
  });

}
catch (e) {
  console.log('Error:', e);
}
