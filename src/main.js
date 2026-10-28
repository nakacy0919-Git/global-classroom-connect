import './styles/global.css';
import './styles/registrationWizard.css';
import { renderApp } from './app';
import './styles/academicPop.css';
import './styles/mobileExperienceV152.css';
import './styles/welcomeFitV156.css';
import './styles/welcomePracticeV169.css';
import './styles/i18nV157.css';

renderApp();
window.addEventListener('hashchange', renderApp);