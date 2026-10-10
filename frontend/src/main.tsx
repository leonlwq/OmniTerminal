import React from 'react'
import {createRoot} from 'react-dom/client'
import './style.css'
import '@xterm/xterm/css/xterm.css'
import App from './App'
import { I18nProvider } from './i18n/I18nContext'

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
    <React.StrictMode>
        <I18nProvider>
            <App/>
        </I18nProvider>
    </React.StrictMode>
)
