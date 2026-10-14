/**
 * Global Classroom Connect — progressive registration wizard.
 * The form and its existing Supabase submission handler are unchanged.
 */
export function initRegistrationWizard() {
  const form = document.querySelector('#public-registration-form');
  if (!form || form.classList.contains('gc-wizard')) return;

  const sections = Array.from(form.querySelectorAll(':scope > .registration-section'));
  const schoolSelect = form.querySelector('#registration-school');
  const schoolGroups = Array.from(form.querySelectorAll('#new-school-registration > .registration-profile-group'));
  const submitArea = form.querySelector('.registration-submit-area');
  if (sections.length !== 5 || schoolGroups.length !== 4 || !submitArea) {
    console.warn('Registration wizard: unexpected form structure; unchanged form retained.');
    return;
  }

  // Keep the source form's original fields and submit listener intact.
  // Browser-native constraint validation cannot focus hidden panels.
  // We validate each active panel, then re-check before submission.
  form.noValidate = true;
  form.classList.add('gc-wizard');

  const steps = [
    { title: 'Invitation code', short: 'Invitation', section: 0 },
    { title: 'Your school', short: 'School', section: 1, group: 0 },
    { title: 'School profile', short: 'Profile', section: 1, group: 1 },
    { title: 'School verification', short: 'Verification', section: 1, group: 2 },
    { title: 'School time zone', short: 'Time zone', section: 1, group: 3 },
    { title: 'Teacher information', short: 'Teacher', section: 2 },
    { title: 'Participating students', short: 'Students', section: 3 },
    { title: 'Review and submit', short: 'Submit', section: 4 },
  ];

  const head = document.createElement('div');
  head.className = 'gc-wizard-head';
  head.innerHTML = `
    <div class="gc-wizard-headline">
      <div>
        <p class="gc-wizard-kicker">GLOBAL CLASSROOM CONNECT · REGISTRATION</p>
        <h1 class="gc-wizard-heading" tabindex="-1">Invitation code</h1>
      </div>
      <div class="gc-wizard-head-actions">
        <a class="gc-wizard-exit" href="#/dashboard" aria-label="Return to host dashboard">← Dashboard</a>
        <span class="gc-wizard-counter" aria-live="polite"></span>
      </div>
    </div>
    <div class="gc-wizard-track" role="progressbar" aria-label="Registration progress" aria-valuemin="1" aria-valuemax="8" aria-valuenow="1">
      <span></span>
    </div>
    <div class="gc-wizard-summary" aria-live="polite"></div>
  `;
  form.prepend(head);

  const review = document.createElement('div');
  review.className = 'gc-wizard-review';
  const messageField = sections[4].querySelector('#registration-notes')?.closest('label');
  if (messageField) sections[4].insertBefore(review, messageField);

  const footer = document.createElement('div');
  footer.className = 'gc-wizard-footer';
  footer.innerHTML = `
    <button type="button" class="secondary-button gc-wizard-back">← Back</button>
    <p class="gc-wizard-error" role="alert"></p>
    <button type="button" class="primary-button gc-wizard-next">Next →</button>
  `;
  form.append(footer);
  footer.append(submitArea);
  const back = footer.querySelector('.gc-wizard-back');
  const next = footer.querySelector('.gc-wizard-next');
  const errorNode = footer.querySelector('.gc-wizard-error');
  const heading = head.querySelector('.gc-wizard-heading');
  let active = 0;

  const flow = () => schoolSelect?.value
    ? [steps[0], steps[1], steps[5], steps[6], steps[7]]
    : steps;

  const reportError = (message, element) => {
    errorNode.textContent = message;
    if (element) {
      element.focus({ preventScroll: true });
      element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    return false;
  };

  function validateStep(step, announce = true) {
    const invalid = (message, el) => announce ? reportError(message, el) : false;
    const check = (root) => {
      for (const el of root.querySelectorAll('input, select, textarea')) {
        if (el.disabled || el.closest('.hidden') || el.closest('.gc-wizard-group-hidden')) continue;
        if (!el.checkValidity()) {
          const label = el.closest('label')?.querySelector('span')?.textContent?.trim() || 'this field';
          return invalid(`Please check: ${label}`, el);
        }
      }
      return true;
    };

    if (step.section === 0) return check(sections[0]);
    if (step.section === 1) {
      if (step.group === 0) {
        if (schoolSelect?.value) return true;
        return check(schoolGroups[0]);
      }
      if (schoolSelect?.value) return true;
      const group = schoolGroups[step.group];
      if (!check(group)) return false;
      if (step.group === 1) {
        const type = form.querySelector('#registration-school-type');
        const level = form.querySelector('#registration-school-level');
        if (!type?.value) return invalid('Select your school type.', type);
        if (!level?.value) return invalid('Select your school level.', level);
      }
      if (step.group === 2) {
        const website = form.querySelector('#registration-website');
        const verify = form.querySelector('#registration-verification-url');
        if (!website?.value.trim() && !verify?.value.trim()) {
          return invalid('Add a school website or verification URL.', website);
        }
      }
      if (step.group === 3) {
        const zone = form.querySelector('#registration-timezone');
        if (!zone?.value) return invalid('Select your school time zone.', zone);
      }
      return true;
    }
    if (step.section === 3) {
      const names = Array.from(form.querySelectorAll('.registration-student-name'));
      if (!names.some(el => el.value.trim())) {
        return invalid('Add at least one student display name.', names[0] || undefined);
      }
    }
    return check(sections[step.section]);
  }

  function render(focusHeading = false) {
    const list = flow();
    active = Math.max(0, Math.min(active, list.length - 1));
    const current = list[active];
    errorNode.textContent = '';
    sections.forEach((el, index) => {
      const shown = current.section === index;
      el.classList.toggle('gc-wizard-active', shown);
      el.setAttribute('aria-hidden', String(!shown));
    });
    schoolGroups.forEach((el, index) => {
      el.classList.toggle('gc-wizard-group-hidden', current.section !== 1 || current.group !== index);
    });
    if (current.section === 4) {
      const schoolName = schoolSelect?.value
        ? schoolSelect.selectedOptions[0]?.textContent?.trim()
        : form.querySelector('#registration-new-school')?.value.trim();
      const teacherName = form.querySelector('#registration-teacher-name')?.value.trim();
      const studentCount = Array.from(form.querySelectorAll('.registration-student-name'))
        .filter(el => el.value.trim()).length;
      review.replaceChildren();
      for (const [label, value] of [
        ['School', schoolName || '—'],
        ['Teacher', teacherName || '—'],
        ['Students', `${studentCount} display name(s)`],
      ]) {
        const row = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = `${label}: `;
        row.append(strong, document.createTextNode(value));
        review.append(row);
      }
    }
    heading.textContent = current.title;
    head.querySelector('.gc-wizard-counter').textContent = `Step ${active + 1} of ${list.length}`;
    const progress = Math.round((active + 1) / list.length * 100);
    head.querySelector('.gc-wizard-track span').style.width = `${progress}%`;
    const bar = head.querySelector('.gc-wizard-track');
    bar.setAttribute('aria-valuemax', String(list.length));
    bar.setAttribute('aria-valuenow', String(active + 1));
    head.querySelector('.gc-wizard-summary').textContent = list.map((x, i) =>
      `${i === active ? '●' : i < active ? '✓' : '○'} ${x.short}`
    ).join('  ·  ');
    back.disabled = active === 0;
    next.hidden = active === list.length - 1;
    submitArea.hidden = active !== list.length - 1;
    const panel = sections[current.section];
    if (panel) panel.scrollTop = 0;
    if (focusHeading) heading.focus({ preventScroll: true });
  }

  back.addEventListener('click', () => {
    active = Math.max(0, active - 1);
    render(true);
  });
  next.addEventListener('click', () => {
    const list = flow();
    if (!validateStep(list[active])) return;
    active = Math.min(list.length - 1, active + 1);
    render(true);
  });
  schoolSelect?.addEventListener('change', () => {
    active = Math.min(active, flow().length - 1);
    render();
  });

  // Validation before the existing Supabase submission handler.
  form.addEventListener('submit', (event) => {
    const list = flow();
    for (let index = 0; index < list.length; index++) {
      if (!validateStep(list[index], false)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        active = index;
        render(true);
        validateStep(list[index], true);
        return;
      }
    }
  }, true);

  render();
}
