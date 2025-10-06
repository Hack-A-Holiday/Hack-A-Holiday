import React from 'react';
import { NextPageContext } from 'next';
import Head from 'next/head';
import Link from 'next/link';

interface ErrorProps {
  statusCode?: number;
  hasGetInitialPropsRun?: boolean;
  err?: Error;
}

function Error({ statusCode, hasGetInitialPropsRun, err }: ErrorProps) {
  if (!hasGetInitialPropsRun && err) {
    // getInitialProps was not run on the server side
    // err is only available on the server side
  }

  return (
    <>
      <Head>
        <title>
          {statusCode
            ? `${statusCode} - Server Error`
            : 'Application Error'}
        </title>
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
            fontSize: '72px',
            marginBottom: '20px'
          }}>
            {statusCode === 404 ? '🔍' : '⚠️'}
          </div>
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '15px',
            color: '#333'
          }}>
            {statusCode === 404
              ? 'Page Not Found'
              : statusCode
              ? `Server Error ${statusCode}`
              : 'Application Error'}
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: '#666',
            marginBottom: '30px',
            lineHeight: '1.6'
          }}>
            {statusCode === 404
              ? "Sorry, we couldn't find the page you're looking for."
              : statusCode
              ? 'A server-side error occurred.'
              : 'An unexpected error occurred.'}
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '12px 30px',
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
        </div>
      </div>
    </>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;