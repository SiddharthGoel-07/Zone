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

console.log("✅ contentScript.js loaded");


chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
if(message.type==="BLOCKED_SITE"){
    blockPage(message.domain);
}
});

function blockPage(domain) {
    // Remove any previous overlay
    const old = document.getElementById('zone-block-overlay');
    if (old) old.remove();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'zone-block-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(44, 62, 80, 0.97)';
    overlay.style.zIndex = 999999;
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.color = '#fff';
    overlay.style.fontFamily = 'Segoe UI, Arial, sans-serif';

    const msg = document.createElement('div');
    msg.style.fontSize = '2rem';
    msg.style.marginBottom = '24px';
    msg.textContent = 'Your limit is over.';
    overlay.appendChild(msg);

    const getCodeBtn = document.createElement('button');
    getCodeBtn.textContent = 'Get the code to refresh the limits';
    getCodeBtn.style.background = '#4f8cff';
    getCodeBtn.style.color = '#fff';
    getCodeBtn.style.border = 'none';
    getCodeBtn.style.borderRadius = '6px';
    getCodeBtn.style.padding = '10px 22px';
    getCodeBtn.style.fontSize = '1rem';
    getCodeBtn.style.cursor = 'pointer';
    getCodeBtn.style.marginBottom = '18px';
    overlay.appendChild(getCodeBtn);

    const codeDiv = document.createElement('div');
    codeDiv.style.display = 'none';
    codeDiv.style.flexDirection = 'column';
    codeDiv.style.alignItems = 'center';
    codeDiv.style.gap = '10px';

    const codeInput = document.createElement('input');
    codeInput.type = 'text';
    codeInput.placeholder = 'Enter code';
    codeInput.style.padding = '8px';
    codeInput.style.fontSize = '1rem';
    codeInput.style.borderRadius = '5px';
    codeInput.style.border = '1px solid #ccc';
    codeDiv.appendChild(codeInput);

    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Submit';
    submitBtn.style.background = '#2563eb';
    submitBtn.style.color = '#fff';
    submitBtn.style.border = 'none';
    submitBtn.style.borderRadius = '6px';
    submitBtn.style.padding = '8px 18px';
    submitBtn.style.fontSize = '1rem';
    submitBtn.style.cursor = 'pointer';
    codeDiv.appendChild(submitBtn);

    const statusMsg = document.createElement('div');
    statusMsg.style.marginTop = '10px';
    statusMsg.style.fontSize = '1rem';
    codeDiv.appendChild(statusMsg);

    overlay.appendChild(codeDiv);

    getCodeBtn.onclick = async() => {
        getCodeBtn.style.display = 'none';
        codeDiv.style.display = 'flex';
        try {
            const uuid = await getUUID();
            await fetch('http://127.0.0.1:3000/api/getCode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uuid })
            });
        } catch (error) {
            console.error('Error fetching code:', error);
        }
    };

    submitBtn.onclick = async () => {
        const code = codeInput.value.trim();
        if (!code) {
            statusMsg.textContent = 'Please enter a code.';
            statusMsg.style.color = '#ffb3b3';
            return;
        }
        statusMsg.textContent = 'Verifying...';
        statusMsg.style.color = '#fff';
        try {
            const uuid = await getUUID();
            const res = await fetch('http://127.0.0.1:3000/api/verifyCode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codex: code, domain, uuid })
            });
            const data = await res.json();
            if (data.success) {
                statusMsg.textContent = 'Limit refreshed! Reloading...';
                statusMsg.style.color = '#b6ffb3';

                chrome.runtime.sendMessage({
                    type: "REFRESH_LIMIT",
                    domain:domain
                 },()=>{
                    setTimeout(() => location.reload(), 1200);
                    });
                
            } else {
                statusMsg.textContent = data.message || 'Invalid code.';
                statusMsg.style.color = '#ffb3b3';
            }
        } catch (e) {
            statusMsg.textContent = 'Server error.';
            statusMsg.style.color = '#ffb3b3';
        }
    };

    document.body.appendChild(overlay);
}