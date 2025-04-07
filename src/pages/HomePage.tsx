// src/pages/HomePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
// Optional: Import some specific styles for the homepage
// import '../styles/HomePage.css';

function HomePage() {
  return (
    <div className="homepage-container" style={styles.container}>
      <h1 style={styles.title}>Welcome to Simple To-Do!</h1>
      <p style={styles.subtitle}>
        Organize your tasks efficiently using our secure app powered by AWS serverless technology.
      </p>
      <div style={styles.buttonGroup}>
        <Link to="/login">
          <button style={styles.button}>Login</button>
        </Link>
        <Link to="/signup">
          <button style={styles.button}>Sign Up</button>
        </Link>
      </div>
      <p style={styles.techInfo}>
          Built with React, TypeScript, Vite, Node.js, AWS Lambda, DynamoDB, Cognito & Cloudflare Pages.
      </p>
    </div>
  );
}

// Basic inline styles (consider moving to a CSS file)
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column' as 'column', // Explicitly type for CSSProperties
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        minHeight: '70vh',
        textAlign: 'center' as 'center',
    },
    title: {
        fontSize: '2.5rem',
        marginBottom: '15px',
        color: '#646cff', // Example color
    },
    subtitle: {
        fontSize: '1.2rem',
        marginBottom: '30px',
        maxWidth: '600px',
        color: 'rgba(255, 255, 255, 0.7)',
    },
     buttonGroup: {
         marginBottom: '30px',
     },
     button: {
         margin: '0 10px',
         padding: '10px 20px',
         fontSize: '1.1rem',
     },
     techInfo: {
        marginTop: '40px',
        fontSize: '0.85em',
        color: '#aaa',
     }
};


// Light mode adaptation (inline styles don't easily support this, better with CSS)
// @media (prefers-color-scheme: light) { ... }


export default HomePage;