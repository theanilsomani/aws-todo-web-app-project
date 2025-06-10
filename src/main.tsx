import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; 
import { Amplify } from 'aws-amplify';
import amplifyConfig from './aws-exports';
import { BrowserRouter } from 'react-router-dom';

Amplify.configure(amplifyConfig);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);