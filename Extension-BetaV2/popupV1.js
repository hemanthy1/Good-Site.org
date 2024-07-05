document.addEventListener('DOMContentLoaded', function () {
    chrome.storage.local.get(['displayName', 'avatarUrl','policySummaries'], function (data) {
        if (data.displayName && data.avatarUrl) {
            document.getElementById('displayName').textContent =`Hi, ${data.displayName}`;
            document.getElementById('avatarUrl').src = data.avatarUrl;
        } else {
            document.getElementById('userInfo').textContent = 'User not logged in.';
        }
    

    if (data.policySummaries) {
        const privacyPolicySummary = data.policySummaries.privacyPolicy;
        const termsOfServiceSummary = data.policySummaries.termsOfService;
  
        if (privacyPolicySummary!="privacyPolicy not found.") {
          document.getElementById('privacyPolicySummary').textContent = privacyPolicySummary;
        } else {
          document.getElementById('privacyPolicySummary').textContent = 'Privacy policy not found. For better performance, please navigate to the privacy policy page';
        }
  
        // if (termsOfServiceSummary) {
        //   document.getElementById('termsOfServiceSummary').textContent = termsOfServiceSummary;
        // } else {
        //   document.getElementById('termsOfServiceSummary').textContent = 'Terms of service not found.';
        // }
      } else {
        document.getElementById('policySummaries').textContent = 'No policy summaries available.';
      }
    });
});