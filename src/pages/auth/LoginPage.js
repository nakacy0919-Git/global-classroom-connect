export function LoginPage() {
  return `
    <section class="participant-shell">

      <article class="participant-card login-card">

        <p class="eyebrow">
          Global Classroom Connect
        </p>

        <h2>
          Host Login
        </h2>

        <p class="muted">
          Sign in to manage schools,
          events and breakout rooms.
        </p>

        <form id="login-form">

          <label class="field">
            <span>Email</span>

            <input
              id="login-email"
              class="input"
              type="email"
              autocomplete="email"
              required
            />
          </label>

          <label class="field login-password-field">
            <span>Password</span>

            <input
              id="login-password"
              class="input"
              type="password"
              autocomplete="current-password"
              required
            />
          </label>

          <button
            class="primary-button full-width"
            type="submit"
          >
            Sign In
          </button>

        </form>

        <p
          id="login-message"
          class="muted login-message"
        ></p>

      </article>

    </section>
  `;
}