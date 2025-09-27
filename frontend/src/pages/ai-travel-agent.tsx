import React from 'react';
import Head from 'next/head';
import Navbar from '../components/layout/Navbar';

export default function AITravelAgent() {
  return (
    <>
      <Head>
        <title>AI Travel Agent - HackTravel</title>
        <meta name="description" content="Your AI-powered travel assistant" />
      </Head>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Navbar />
        <main style={{ maxWidth: 800, margin: '0 auto', padding: 40, color: '#222' }}>
          <h1 style={{ fontSize: '2.2rem', marginBottom: 24 }}>🤖 AI Travel Agent</h1>
          <p>Welcome to your AI-powered travel assistant! Here you can chat with the agent, ask questions about your trip, and get personalized recommendations.</p>
          {/* TODO: Add chat interface or agent UI here */}
        </main>
      </div>
    </>
  );
}
