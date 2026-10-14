import './styles/global.css';
import './styles/registrationWizard.css';
import { renderApp } from './app';

renderApp();
window.addEventListener('hashchange', renderApp);