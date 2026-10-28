import './styles/global.css';
import './styles/registrationWizard.css';
import { renderApp } from './app';
import './styles/academicPop.css';
import './styles/mobileExperienceV152.css';

renderApp();
window.addEventListener('hashchange', renderApp);