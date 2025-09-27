import React, { useState } from 'react';
import axios from 'axios';

const AiAgentPage = () => {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Welcome to your AI Travel Agent! How can I assist you today?' },
  ]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await axios.post('/api/ai-agent', {
        messages: [...messages, userMessage],
      });

      const aiMessage = response.data;
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error communicating with AI:', error);
      setMessages((prev) => [...prev, { role: 'system', content: 'Sorry, something went wrong. Please try again.' }]);
    }

    setInput('');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>AI Travel Agent</h1>
      <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px', marginBottom: '10px' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '10px' }}>
            <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
        style={{ width: '80%', padding: '10px', marginRight: '10px' }}
      />
      <button onClick={sendMessage} style={{ padding: '10px' }}>
        Send
      </button>
    </div>
  );
};

export default AiAgentPage;