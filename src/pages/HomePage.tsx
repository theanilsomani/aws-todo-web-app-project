import React from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="homepage-container" style={styles.container}>
      <h1 style={styles.title}>Simple. Smart. Serverless.</h1>
      
      <p style={styles.subtitle}>
        This To-Do List Web App helps you manage tasks with reminder emails, powered entirely by AWS Serverless architecture — no servers to manage, and it fits within AWS’s Always Free Tier.
      </p>

      <div style={styles.buttonGroup}>
        <Link to="/login">
          <button style={styles.button}>Login</button>
        </Link>
        <Link to="/signup">
          <button style={styles.button}>Sign Up</button>
        </Link>
      </div>

      <p style={styles.description}>
        Create tasks, set reminders, and get notified — all effortlessly, securely, and for free. Built with React, TypeScript, Vite, Node.js, and AWS services including Lambda, DynamoDB, Cognito, SNS, EventBridge, CloudWatch, and IAM.
      </p>

      <img
        src="/image.png"
        alt="AWS Architecture Diagram"
        style={styles.image}
      />

      <p style={styles.techInfo}>
        Open-source project showcasing modern cloud development with AWS Serverless stack.
      </p>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    minHeight: '80vh',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '2.8rem',
    marginBottom: '20px',
    color: '#646cff',
  },
  subtitle: {
    fontSize: '1.2rem',
    marginBottom: '25px',
    maxWidth: '700px',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  buttonGroup: {
    marginBottom: '30px',
  },
  button: {
    margin: '0 10px',
    padding: '10px 20px',
    fontSize: '1.1rem',
    cursor: 'pointer',
  },
  description: {
    maxWidth: '800px',
    fontSize: '1rem',
    marginBottom: '40px',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  image: {
    maxWidth: '90%',
    height: 'auto',
    borderRadius: '8px',
    marginBottom: '30px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
  techInfo: {
    fontSize: '0.85em',
    color: '#aaa',
  }
};

export default HomePage;
