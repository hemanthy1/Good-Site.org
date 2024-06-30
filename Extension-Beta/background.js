// chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
//     if (request.action === 'login') {
//       chrome.identity.launchWebAuthFlow({
//         url: 'https://good-site.org/auth/tiktok',
//         interactive: true
//       }, function(redirectUrl) {
//         if (chrome.runtime.lastError) {
//           console.error(chrome.runtime.lastError);
//         } else {
//           const url = new URL(redirectUrl);
//           const displayName = url.searchParams.get('display_name');
//           const avatarUrl = url.searchParams.get('avatar_url');
  
//           if (displayName && avatarUrl) {
//             chrome.storage.sync.set({displayName: displayName, avatarUrl: avatarUrl}, function() {
//               chrome.runtime.sendMessage({
//                 action: 'loginSuccess',
//                 displayName: displayName,
//                 avatarUrl: avatarUrl
//               });
//             });
//           }
//         }
//       });
//     }
//   });

const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

// A global promise to avoid concurrency issues
let creatingOffscreenDocument;

// Chrome only allows for a single offscreenDocument. This is a helper function
// that returns a boolean indicating if a document is already active.
async function hasDocument() {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const matchedClients = await clients.matchAll();
  return matchedClients.some(
    (c) => c.url === chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)
  );
}

async function setupOffscreenDocument(path) {
  // If we do not have a document, we are already setup and can skip
  if (!(await hasDocument())) {
    // create offscreen document
    // if (creating) {
    //   await creating;
    // } else {
    //   creating = chrome.offscreen.createDocument({
    //     url: path,
    //     reasons: [
    //         chrome.offscreen.Reason.DOM_SCRAPING
    //     ],
    //     justification: 'authentication'
    //   });
    //   await creating;
    //   creating = null;
    // }

    await chrome.offscreen.createDocument({
        url: path,
        reasons: [
          chrome.offscreen.Reason.DOM_SCRAPING
        ],
        justification: 'authentication'
      });
  }
}

async function closeOffscreenDocument() {
  if (!(await hasDocument())) {
    return;
  }
  await chrome.offscreen.closeDocument();
}

function getAuth() {
  return new Promise(async (resolve, reject) => {
    const auth = await chrome.runtime.sendMessage({
      type: 'firebase-auth',
      target: 'offscreen'
    });
    auth?.name !== 'FirebaseError' ? resolve(auth) : reject(auth);
  })
}

async function firebaseAuth() {
  await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);

  const auth = await getAuth()
    .then((auth) => {
      console.log('User Authenticated', auth);
      return auth;
    })
    .catch(err => {
      if (err.code === 'auth/operation-not-allowed') {
        console.error('You must enable an OAuth provider in the Firebase' +
                      ' console in order to use signInWithPopup. This sample' +
                      ' uses Google by default.');
      } else {
        console.error(err);
        return err;
      }
    })
    .finally(closeOffscreenDocument)

  return auth;
}

async function tiktokAuth() {
    await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
  
    const auth = await getAuth()
      .then((auth) => {
        console.log('User Authenticated', auth);
        // Update the extension UI with the user's display name and avatar URL
        return auth;
      })
      .catch(err => {
        console.error(err);
        return err;
      })
      .finally(closeOffscreenDocument);
  
    return auth;
  }

tiktokAuth();