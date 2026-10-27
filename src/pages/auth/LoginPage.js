import '../../styles/hostLoginV143.css';
import gccLogo from '../../assets/gcc-v119-official.webp';

/**
 * Host-only login page. Keep legacy form element IDs unchanged so the
 * existing Supabase Auth submit handler in src/app.js stays untouched.
 */
export function LoginPage() {
  return `
    <section class="participant-shell gcc143-login-scene" aria-labelledby="gcc143-host-heading">
      <div class="gcc143-scenic-copy" aria-hidden="true">
        <span class="gcc143-scenic-kicker">GLOBAL CLASSROOM CONNECT</span>
        <h1>Connecting classrooms.<br/>Creating possibilities.</h1>
        <p>Bring the world into every classroom.</p>
      </div>

      <article class="participant-card login-card gcc143-login-card">
        <a class="gcc143-back" href="#/welcome" aria-label="Back to Global Classroom Connect home">
          <span aria-hidden="true">←</span> Back to GCC
        </a>
        <header class="gcc143-login-heading">
          <img src="${gccLogo}" alt="" class="gcc143-brand-logo" width="64" height="64" />
          <div>
            <p class="eyebrow gcc143-brand-name">GLOBAL CLASSROOM CONNECT</p>
            <h2 id="gcc143-host-heading">Host sign in</h2>
          </div>
        </header>
        <p class="gcc143-login-intro">Manage your sessions and breakout rooms.</p>

        <form id="login-form" class="gcc143-login-form">
          <label class="field" for="login-email">
            <span>Email address</span>
            <input id="login-email" class="input" type="email"
              autocomplete="username" inputmode="email" required />
          </label>
          <label class="field login-password-field" for="login-password">
            <span>Password</span>
            <input id="login-password" class="input" type="password"
              autocomplete="current-password" required />
          </label>
          <div class="gcc143-login-actions">
            <button class="primary-button gcc143-login-submit" type="submit">
              Sign in <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
        <p id="login-message" class="muted login-message gcc143-login-message" role="status" aria-live="polite"></p>
      </article>
    </section>
  `;
}
