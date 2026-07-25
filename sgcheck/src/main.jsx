// Set saved theme immediately to prevent flash
(function() {
  try {
    var theme = localStorage.getItem('canesense_theme')
    if (theme) document.documentElement.setAttribute('data-theme', theme)
  } catch(e) {}
})()

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
