import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Custom404() {
  return (
    <>
      <Head>
        <title>404 - Page Not Found | HackTravel</title>
        <meta name="description" content="The page you're looking for could not be found." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '60px 40px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
          maxWidth: '500px',
          margin: '20px'
        }}>
          <div style={{
            fontSize: '120px',
            marginBottom: '20px'
          }}>
            🔍
          </div>
          <h1 style={{
            fontSize: '3rem',
            marginBottom: '15px',
            color: '#333',
            fontWeight: '700'
          }}>
            404
          </h1>
          <h2 style={{
            fontSize: '1.5rem',
            marginBottom: '20px',
            color: '#555',
            fontWeight: '500'
          }}>
            Page Not Found
          </h2>
          <p style={{
            fontSize: '1.1rem',
            color: '#666',
            marginBottom: '40px',
            lineHeight: '1.6'
          }}>
            Sorry, we couldn't find the page you're looking for. 
            It might have been moved, deleted, or you entered the wrong URL.
          </p>
          <div style={{
            display: 'flex',
            gap: '15px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Link
              href="/"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '12px 25px',
                borderRadius: '25px',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'transform 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              🏠 Go Home
            </Link>
            <Link
              href="/plan-trip"
              style={{
                display: 'inline-block',
                background: 'transparent',
                color: '#667eea',
                border: '2px solid #667eea',
                padding: '10px 25px',
                borderRadius: '25px',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#667eea';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#667eea';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              ✈️ Plan a Trip
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}