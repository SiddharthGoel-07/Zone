
let blockedSites = [];
let current = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "REFRESH_LIMIT") {

    const domain = message.domain;

    current.delete(domain);
    console.log("🔁 Limit refreshed.");
  }
});



function getUUID() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['uuid'], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result.uuid); // may be undefined if not set
      }
    });
  });
}

setInterval(() => {
  console.log("Checking for blocked sites...");
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs.length > 0 && tabs[0].url) {
      const url = tabs[0].url;
      const domain = new URL(url).hostname;
      const uuid = await getUUID();
      fetchBlockedSites(domain, uuid);
    }
  });
}, 10000);

async function fetchBlockedSites(domain, uuid) {
  try {
    if (!uuid) uuid = await getUUID();
    const res = await fetch('http://127.0.0.1:3000/api/getBlockedSites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uuid, domain })
    });

    blockedSites = await res.json();

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].url) {
        const tab = tabs[0];
        const host = new URL(tab.url).hostname;

        blockedSites.forEach((site) => {
          if ((host === site.url || host.endsWith("." + site.url)) && site.block && !current.has(host)) {

            current.set(host, true);
            chrome.tabs.sendMessage(tab.id, {
              type: "BLOCKED_SITE",
              domain: host
            });
          }
        });
      }
    });


  } catch (error) {
    console.log(error);
  }
}

let ex = "wwwwwww"
getUUID().then(uuid => fetchBlockedSites(ex, uuid));



chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

  if (changeInfo.status === "complete" && tab.url) {
    const domain = new URL(tab.url).hostname;

    if (current.has(domain)) {
      chrome.tabs.sendMessage(tab.id, {
        type: "BLOCKED_SITE",
        domain: domain
      });
    }
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  const domain = new URL(tab.url).hostname;

  if (current.has(domain)) {
    chrome.tabs.sendMessage(tab.id, {
      type: "BLOCKED_SITE",
      domain: domain
    });
  }
});


