// Chat Hub specific logic
document.addEventListener('DOMContentLoaded', async () => {
  await window.authPromise;
  initMessages();
});

let activeContactId = null;
let activeContactName = '';
let chatInterval = null;

async function initMessages() {
  if (!currentUser) {
    window.location.href = '/index.html';
    return;
  }

  // Parse contactId from URL (if student booked or clicked "Message Sarah" from detail page)
  const urlParams = new URLSearchParams(window.location.search);
  const paramContactId = urlParams.get('contactId');

  if (paramContactId) {
    activeContactId = paramContactId;
    // Fetch contact details to show in header immediately
    await fetchAndSetActiveContact(paramContactId);
  }

  // Load channels list
  await loadChannels();

  // Set up sending handlers
  const sendBtn = Array.from(document.querySelectorAll('button')).find(el => el.querySelector('span')?.textContent.includes('send') || el.innerHTML.includes('send'));
  const textarea = document.querySelector('textarea');

  if (sendBtn && textarea) {
    sendBtn.addEventListener('click', () => sendMessage(textarea));
    textarea.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(textarea);
      }
    });
  }

  // Poll for new messages every 3 seconds
  chatInterval = setInterval(pollNewMessages, 3000);
}

async function fetchAndSetActiveContact(id) {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (res.ok) {
      const data = await res.json();
      activeContactName = data.name;
      const avatarUrl = (data.avatar && (data.avatar.startsWith('http') || data.avatar.length > 2)) ? data.avatar : '';
      updateChatHeader(data.name, avatarUrl);
      loadChatHistory(id);
    } else {
      activeContactName = "Instructor / Student";
      updateChatHeader(activeContactName, '');
      loadChatHistory(id);
    }
  } catch (err) {
    console.error(err);
  }
}

function updateChatHeader(name, avatar) {
  const chatHeaderName = document.querySelector('section.flex-1 h3.font-label-md');
  const chatHeaderAvatar = document.querySelector('section.flex-1 img.h-full.w-full');
  if (chatHeaderName) chatHeaderName.textContent = name;
  if (chatHeaderAvatar && avatar) {
    chatHeaderAvatar.src = avatar;
  }
}

async function loadChannels() {
  const conversationsHeader = Array.from(document.querySelectorAll('aside h3')).find(el => el.textContent.includes('Conversations'));
  const channelsList = document.querySelector('.overflow-y-auto.flex-grow, .overflow-y-auto.flex-1.divide-y') || 
                       document.querySelector('aside .flex.flex-col.divide-y') ||
                       (conversationsHeader?.parentElement?.nextElementSibling) ||
                       document.querySelector('section:first-child .overflow-y-auto');
  if (!channelsList) return;

  try {
    const res = await fetch('/api/messages/channels');
    const channels = await res.json();

    // If activeContactId is set but not in channel list, we inject a temporary channel for it
    if (activeContactId && !channels.some(c => c.contactId === activeContactId)) {
      channels.unshift({
        contactId: activeContactId,
        contactName: activeContactName || 'New Conversation',
        lastMessage: 'Starting a new conversation...',
        timestamp: new Date().toISOString()
      });
    }

    if (channels.length === 0) {
      channelsList.innerHTML = `<p class="text-on-surface-variant italic text-label-sm p-4 text-center">No active chats. Start one by visiting a tutor's profile.</p>`;
      return;
    }

    channelsList.innerHTML = channels.map(chan => {
      const isSelected = chan.contactId === activeContactId;
      const initialLetters = chan.contactName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      
      const timeStr = new Date(chan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return `
        <div onclick="selectChannel('${chan.contactId}', '${chan.contactName}')" 
          class="p-unit-md hover:bg-surface-container-low transition-colors cursor-pointer ${isSelected ? 'bg-surface-container' : ''}">
          <div class="flex gap-unit-sm">
            <div class="h-12 w-12 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold flex items-center justify-center flex-shrink-0">
              ${initialLetters}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start mb-1">
                <span class="font-label-md text-on-surface truncate">${chan.contactName}</span>
                <span class="text-[10px] text-outline whitespace-nowrap">${timeStr}</span>
              </div>
              <p class="text-label-sm text-outline truncate">${chan.lastMessage}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Select first channel if none active
    if (!activeContactId && channels.length > 0) {
      selectChannel(channels[0].contactId, channels[0].contactName);
    }
  } catch (err) {
    console.error(err);
  }
}

function selectChannel(id, name) {
  activeContactId = id;
  activeContactName = name;
  updateChatHeader(name, '');
  loadChannels();
  loadChatHistory(id);
}

async function loadChatHistory(contactId) {
  const historyContainer = document.querySelector('section.flex-1 .overflow-y-auto') || 
                           document.querySelector('main div:has(.message-bubble-student)');
  if (!historyContainer) return;

  try {
    const res = await fetch('/api/messages');
    const messages = await res.json();

    // Filter messages for active contact
    const activeMessages = messages.filter(msg => 
      (msg.senderId === currentUser.id && msg.receiverId === contactId) ||
      (msg.senderId === contactId && msg.receiverId === currentUser.id)
    );

    if (activeMessages.length === 0) {
      historyContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 text-center text-outline">
          <span class="material-symbols-outlined text-[48px] mb-2">forum</span>
          <p class="text-label-sm">No messages yet. Send a message to start the chat!</p>
        </div>
      `;
      return;
    }

    historyContainer.innerHTML = activeMessages.map(msg => {
      const isSelf = msg.senderId === currentUser.id;
      const initialLetters = msg.senderName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (isSelf) {
        return `
          <div class="flex flex-row-reverse gap-unit-md max-w-[80%] ml-auto mb-4">
            <div class="h-8 w-8 rounded-full bg-primary-container text-primary font-bold flex items-center justify-center flex-shrink-0 mt-auto text-xs">
              ${initialLetters}
            </div>
            <div class="flex flex-col items-end">
              <div class="bg-gradient-to-r from-primary to-secondary text-white p-unit-md rounded-2xl shadow-md rounded-br-none text-left">
                <p class="text-body-md">${msg.text}</p>
              </div>
              <span class="text-[10px] text-outline mt-1 mr-2 flex items-center gap-1.5 select-none">
                <span>${timeStr}</span>
                <span onclick="deleteMessage('${msg.id}')" class="material-symbols-outlined text-[14px] hover:text-error cursor-pointer transition-colors" style="font-size: 14px;" title="Delete Message">delete</span>
              </span>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="flex gap-unit-md max-w-[80%] mb-4 text-left">
            <div class="h-8 w-8 rounded-full bg-surface-dim text-on-surface-variant font-bold flex items-center justify-center flex-shrink-0 mt-auto text-xs">
              ${initialLetters}
            </div>
            <div>
              <div class="bg-surface-container-low border border-outline-variant/30 text-on-surface p-unit-md rounded-2xl shadow-sm rounded-bl-none">
                <p class="text-body-md">${msg.text}</p>
              </div>
              <span class="text-[10px] text-outline mt-1 ml-2 flex items-center gap-1.5 select-none">
                <span>${timeStr}</span>
                <span onclick="deleteMessage('${msg.id}')" class="material-symbols-outlined text-[14px] hover:text-error cursor-pointer transition-colors" style="font-size: 14px;" title="Delete Message">delete</span>
              </span>
            </div>
          </div>
        `;
      }
    }).join('');

    // Scroll to bottom
    historyContainer.scrollTop = historyContainer.scrollHeight;
  } catch (err) {
    console.error(err);
  }
}

async function sendMessage(textarea) {
  const text = textarea.value.trim();
  if (!text || !activeContactId) return;

  if (currentUser && currentUser.role === 'tutor' && window.isTutorTrialExpired && window.isTutorTrialExpired(currentUser)) {
    showToast('Your trial has expired. Please subscribe to Premium to send messages.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverId: activeContactId,
        text: text
      })
    });

    if (res.ok) {
      textarea.value = '';
      await loadChatHistory(activeContactId);
      loadChannels();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to send message', 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

async function pollNewMessages() {
  if (activeContactId) {
    await loadChatHistory(activeContactId);
  }
}

// Global delete message function
window.deleteMessage = async function(id) {
  if (!confirm('Are you sure you want to delete this message?')) return;
  try {
    const res = await fetch(`/api/messages/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      if (activeContactId) {
        await loadChatHistory(activeContactId);
        loadChannels();
      }
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete message');
    }
  } catch (err) {
    console.error('Error deleting message:', err);
  }
};

// Clean up interval on page change
window.addEventListener('beforeunload', () => {
  if (chatInterval) clearInterval(chatInterval);
});

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl z-[2000] border backdrop-blur-md transition-all duration-300 transform translate-y-10 opacity-0 ${
    type === 'success' 
      ? 'bg-green-500/10 border-green-500/30 text-green-700' 
      : 'bg-error-container/80 border-error/30 text-on-error-container'
  }`;
  toast.innerHTML = `
    <div class="flex items-center gap-2 font-label-md">
      <span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span>
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('translate-y-10', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('translate-y-10', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
