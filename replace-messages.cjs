const fs = require('fs');

let code = fs.readFileSync('src/components/messaging/MessagesView.tsx', 'utf8');

// Replace fetch conversations
code = code.replace(/const q = query\(\s*collection\(db, 'conversations'\)[\s\S]*?return \(\) => unsubscribe\(\);\s*\}/, `const fetchConversations = () => {
      fetch('/api/conversations', { headers: { 'Authorization': \`Bearer \${localStorage.getItem('token')}\` } })
        .then(res => res.json())
        .then(data => {
          setConversations(data || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };
    fetchConversations();
    const intv = setInterval(fetchConversations, 10000);
    return () => clearInterval(intv);
  }`);

// Replace fetch participant profiles
code = code.replace(/const q = query\(collection\(db, 'users'\)[\s\S]*?return unsubscribe;\s*\}/, `const fetchProfiles = async () => {
      try {
        const res = await fetch('/api/users/public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('token')}\` },
          body: JSON.stringify({ uids: otherParticipants })
        });
        const data = await res.json();
        setParticipantsInfo(prev => ({ ...prev, ...data }));
      } catch (err) {}
    };
    fetchProfiles();
  }`);

// Replace fetch messages
code = code.replace(/const q = query\(\s*collection\(db, 'conversations', selectedConversation\.id, 'messages'\)[\s\S]*?return \(\) => unsubscribe\(\);\s*\}/, `const fetchMessages = () => {
      fetch(\`/api/conversations/\${selectedConversation.id}/messages\`, { headers: { 'Authorization': \`Bearer \${localStorage.getItem('token')}\` } })
        .then(res => res.json())
        .then(data => {
          setMessages(data || []);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        });
    };
    fetchMessages();
    const intv = setInterval(fetchMessages, 3000);
    return () => clearInterval(intv);
  }`);

// Replace handleSendMessage
code = code.replace(/await addDoc\(collection\(db, 'conversations'[\s\S]*?updatedAt: new Date\(\)\.toISOString\(\)\s*\}\);/, `await fetch(\`/api/conversations/\${selectedConversation.id}/messages\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('token')}\` },
        body: JSON.stringify({ senderId: user.uid, text: msgText })
      });`);

fs.writeFileSync('src/components/messaging/MessagesView.tsx', code);
