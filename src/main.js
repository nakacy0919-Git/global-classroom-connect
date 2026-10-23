import './styles/global.css';
import './styles/registrationWizard.css';
import { renderApp } from './app';
import './styles/academicPop.css';

renderApp();
window.addEventListener('hashchange', renderApp);