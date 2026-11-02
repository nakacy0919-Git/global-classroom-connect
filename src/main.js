import './styles/global.css';
import './styles/registrationWizard.css';
import { renderApp } from './app';
import './styles/academicPop.css';
import './styles/mobileExperienceV152.css';
import './styles/welcomeFitV156.css';
import './styles/welcomePracticeV169.css';
import './styles/i18nV157.css';
import './styles/welcomeButtonsV173.css';
import './styles/welcomeAccountV184.css';
// Keep the Create Session width fix last, after legacy two-column/mobile layouts.
import './styles/sessionFormWideV205.css';
import './styles/singleLanguageSwitcherV206.css';

renderApp();
window.addEventListener('hashchange', renderApp);