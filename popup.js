const email=document.getElementById('email');
const password=document.getElementById('password');

// UI Elements
const urlList = document.getElementById('urlList');
const addUrlBtn = document.getElementById('addUrlBtn');
const blockBtn = document.getElementById('blockBtn');
const messageDiv = document.getElementById('message');
const partnerEmail = document.getElementById('partnerEmail');
const verifyEmailBtn = document.getElementById('verifyEmailBtn');
const codeSection = document.getElementById('codeSection');
const verificationCode = document.getElementById('verificationCode');
const submitCodeBtn = document.getElementById('submitCodeBtn');

let emailVerified = false;

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

(async () => {
    let uuid = await getUUID();
    if (!uuid) {
        uuid = crypto.randomUUID();
        chrome.storage.local.set({uuid},()=>{
            console.log("UUID generated and saved:", uuid);
        });
    } else {
        console.log("UUID already exists:", uuid);
    }
})();

// Add new URL row
addUrlBtn.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'url-row';
    row.innerHTML = `
        <input type="text" placeholder="https://example.com" class="url-input">
        <input type="number" min="1" placeholder="Minutes" class="duration-input">
        <button type="button" class="remove-btn">✕</button>
    `;
    row.querySelector('.remove-btn').addEventListener('click', () => row.remove());
    urlList.appendChild(row);
    updateRemoveButtons();
});

// Update remove button visibility
function updateRemoveButtons() {
    const rows = urlList.querySelectorAll('.url-row');
    rows.forEach((row, idx) => {
        const btn = row.querySelector('.remove-btn');
        btn.classList.toggle('hidden', rows.length === 1);
    });
}
updateRemoveButtons();

// Email verification UI
verifyEmailBtn.addEventListener('click', async () => {
    if (!partnerEmail.value) {
        showMessage('Please enter an email.', true);
        return;
    }
    // Send code using fetch
    const res = await fetch('http://localhost:3000/api/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: partnerEmail.value })
    });
    const data = await res.json();
    codeSection.classList.remove('hidden');
    showMessage('Verification code sent to email.', false);
});

submitCodeBtn.addEventListener('click', async () => {
    const res = await fetch('http://localhost:3000/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode.value })
    });
    const data = await res.json();
    if (data.success) { // Simulate code
        emailVerified = true;
        showMessage('Email verified! You can now block URLs.', false);
        blockBtn.classList.remove('disabled');
        partnerEmail.setAttribute('readonly', true);
        verifyEmailBtn.classList.add('disabled');
        codeSection.classList.add('hidden');
    } else {
        showMessage('Invalid code', true);
    }
});

// Block button
blockBtn.addEventListener('click', async () => {
    if (!emailVerified) return;
    const urlRows = urlList.querySelectorAll('.url-row');
    const blocks = [];
    urlRows.forEach(row => {
        const url = row.querySelector('.url-input').value.trim();
        const duration = row.querySelector('.duration-input').value.trim();
        if (url && duration) {
            blocks.push({ url, duration: parseInt(duration) });
        }
    });
    if (blocks.length === 0) {
        showMessage('Please enter at least one URL and duration.', true);
        return;
    }
    const uuid = await getUUID();
    await fetch('http://localhost:3000/api/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list: blocks, uuid , email: partnerEmail.value })
    });
    showMessage('Blocking started for: ' + blocks.map(b => b.url).join(', '), false);
});

function showMessage(msg, isError) {
    messageDiv.textContent = msg;
    messageDiv.style.color = isError ? '#d32f2f' : '#2563eb';
}