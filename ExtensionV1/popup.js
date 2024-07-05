document.addEventListener('DOMContentLoaded', function () {
    chrome.storage.local.get(['displayName', 'avatarUrl', 'policySummaries', 'websiteName'], function (data) {
        if (data.displayName && data.avatarUrl) {
            document.getElementById('displayName').textContent = `Hi, ${data.displayName}`;
            document.getElementById('avatarUrl').src = data.avatarUrl;
            document.getElementById('loginButton').style.display = 'none';
        } else {
            document.getElementById('userInfo').textContent = 'User not logged in.';
            document.getElementById('loginButton').style.display = 'block';
        }

        if (data.websiteName) {
            document.getElementById('TitleName').textContent = `Privacy Policy for: ${data.websiteName}`;
        }
        if (data.policySummaries) {
            const privacyPolicySummary = data.policySummaries.privacyPolicy;

            if (privacyPolicySummary !== "privacyPolicy not found.") {
                const tableBody = document.getElementById('privacyPolicySummaryTable');
                const prosCons = JSON.parse(privacyPolicySummary);
                const rows = [];

                prosCons.Pros.forEach((pro, index) => {
                    const row = document.createElement('tr');
                    const proCell = document.createElement('td');
                    proCell.innerHTML = `<div class="main-point"><i class="fas fa-check-circle pro-icon"></i>${pro["Main Point"]}<div class="summary-text">${pro["Description"]}</div></div>`;
                    row.appendChild(proCell);
                    rows[index] = row;
                });

                prosCons.Cons.forEach((con, index) => {
                    const conCell = document.createElement('td');
                    conCell.innerHTML = `<div class="main-point"><i class="fas fa-times-circle con-icon"></i>${con["Main Point"]}<div class="summary-text">${con["Description"]}</div></div>`;
                    rows[index].appendChild(conCell);
                });

                rows.forEach(row => {
                    tableBody.appendChild(row);
                });
            } else {
                document.getElementById('privacyPolicySummaryTable').textContent = 'Privacy policy not found. For better performance, please navigate to the privacy policy page';
            }

            // if (termsOfServiceSummary) {
            //   document.getElementById('termsOfServiceSummary').textContent = termsOfServiceSummary;
            // } else {
            //   document.getElementById('termsOfServiceSummary').textContent = 'Terms of service not found.';
            // }
        } else {
            document.getElementById('privacyPolicySummaryTable').textContent = 'No policy summaries available.';
        }
        
    });

    document.getElementById('loginButton').addEventListener('click', function () {
        chrome.runtime.sendMessage({ action: 'tiktokAuth' }, function (response) {
          if (response.success) {
            document.getElementById('loginButton').style.display = 'none';
            document.getElementById('userInfo').style.display = 'flex';
            document.getElementById('displayName').textContent = `Hi, ${response.displayName}`;
            document.getElementById('avatarUrl').src = response.avatarUrl;
          }
        });
      });
      
});