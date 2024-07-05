function findPolicyLinks() {
    const privacyPolicyRegex = /(privacy policy|privacy statement|privacy notice)/i;
    const termsOfServiceRegex = /(terms of service|terms and conditions|user agreement)/i;

    const links = document.getElementsByTagName('a');
    console.log('Links:', links)
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'findPolicyLinks') {
        const policyLinks = findPolicyLinks();
        sendResponse(policyLinks);
    }
});