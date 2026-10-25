import { organizerZones, createWorldClockPanel } from '../../components/WorldClockPanel.js';
import { createTimezoneMap } from '../../components/WorldTimezoneMap.js';
import { addEvent } from '../../services/eventService.js';
import { makeSlot } from '../../lib/matching.js';

const zones = organizerZones;

function toUTC(date, time, zone) {
  if (!/^\d{4}-\d\d-\d\d$/.test(date) ||
      !/^\d\d:\d\d$/.test(time)) {
    return { error: 'Please select a date and time.' };
  }

  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);

  if (y < 2020 || y > 2100 || h > 23 || min > 59 ||
      new Date(Date.UTC(y, m - 1, d))
        .toISOString().slice(0, 10) !== date) {
    return { error: 'Invalid date or time.' };
  }

  const naive = Date.UTC(y, m - 1, d, h, min);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });

  const matches = [];

  for (let offset = -840; offset <= 840; offset += 15) {
    const utc = naive - offset * 60000;
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(utc))
        .filter(p => p.type !== 'literal')
        .map(p => [p.type, Number(p.value)])
    );

    if (parts.year === y && parts.month === m &&
        parts.day === d && parts.hour === h &&
        parts.minute === min) {
      matches.push(utc);
    }
  }

  if (matches.length !== 1) {
    return {
      error: matches.length === 0
        ? 'This time does not exist due to daylight saving time.'
        : 'This time occurs twice. Choose a different time.'
    };
  }

  return { iso: new Date(matches[0]).toISOString() };
}

export function SchedulingPage() {
  return `
    <style>
      @media(min-width:850px) and (min-height:620px) {
        body:has(.gc-plan){overflow:hidden}
        #app:has(.gc-plan){
          height:100dvh;min-height:0;overflow:hidden
        }
        .app-shell:has(.gc-plan){height:100%;min-height:0}
        .main-shell:has(.gc-plan){min-height:0}
        .page-content:has(.gc-plan){
          flex:1;min-height:0;overflow:hidden
        }
      }
      .gc-plan{
        height:100%;min-height:570px;
        display:flex;flex-direction:column;
        background:#f7fbff;border:1px solid #d6e6f1;
        border-radius:22px;padding:20px 24px;min-width:0
      }
      .gc-plan h2{margin:0 0 8px;font-size:1.55rem}
      .gc-plan h3{margin:0 0 8px}
      .gc-plan p{color:#54748b;line-height:1.5}
      .gc-plan-head{
        display:flex;justify-content:space-between;
        align-items:center;gap:12px
      }
      .gc-plan-progress{
        height:7px;background:#d9eaf5;
        border-radius:20px;margin:14px 0;overflow:hidden
      }
      .gc-plan-progress span{
        display:block;width:33%;height:100%;
        background:#1479bd
      }
      .gc-plan-tabs{
        display:flex;justify-content:space-between;
        font-size:.8rem;color:#688aa0;
        padding-bottom:14px;gap:10px
      }
      .gc-plan-tabs .current{color:#116caa;font-weight:700}
      .gc-plan-body{
        flex:1;min-height:0;overflow:auto;padding:4px 2px
      }
      .gc-plan [hidden]{display:none!important}
      .gc-plan-fields{
        display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
        gap:16px;margin-top:18px
      }
      .gc-plan-fields label{
        display:flex;flex-direction:column;gap:9px;
        font-weight:600
      }
      .gc-plan-fields input,.gc-plan-fields select{
        font:inherit;border:1px solid #c7dce9;
        border-radius:12px;padding:13px;
        min-width:0;width:100%;background:white
      }
      .gc-plan-clocks{
        display:grid;grid-template-columns:repeat(3,minmax(0,1fr));
        gap:10px;margin-top:18px
      }
      .gc-plan-clock{
        background:white;border:1px solid #d7e9f3;
        border-radius:13px;padding:12px;
        display:flex;flex-direction:column;gap:6px
      }
      .gc-plan-clock strong{color:#143f5d}
      .gc-plan-clock small{color:#6c8899}
      .gc-plan-review{display:grid;gap:12px;margin-top:18px}
      .gc-plan-review div{
        background:white;border:1px solid #d6e7f3;
        border-radius:12px;padding:14px
      }
      .gc-plan-review span{
        display:block;color:#607f94;margin-bottom:6px
      }
      .gc-plan-footer{
        border-top:1px solid #d8e8f1;
        display:flex;gap:12px;align-items:center;
        padding-top:14px;margin-top:12px
      }
      .gc-plan-footer p{
        flex:1;margin:0;color:#a32929;font-size:.83rem
      }
      .gc-plan-footer button:disabled{opacity:.5}
      @media(max-width:800px){
        .gc-plan-fields{grid-template-columns:1fr}
        .gc-plan-clocks{grid-template-columns:repeat(2,1fr)}
      }
      @media(max-width:600px){
        .gc-plan{min-height:670px}
        .gc-plan-clocks{grid-template-columns:1fr}
      }
    </style>

    <section class="gc-plan">
      <div class="gc-plan-head">
        <div>
          <p class="eyebrow">Global Classroom Connect</p>
          <h2>Schedule Planner</h2>
          <p>Plan an exchange across time zones.</p>
        </div>
        <strong id="gcp-counter">Step 1 of 3</strong>
      </div>

      <div class="gc-plan-progress">
        <span id="gcp-progress"></span>
      </div>

      <nav class="gc-plan-tabs">
        <span data-tab="0">1. Session</span>
        <span data-tab="1">2. World time</span>
        <span data-tab="2">3. Save</span>
      </nav>

      <div class="gc-plan-body">
        <section data-step="0">
          <h3>Session details</h3>
          <p>Create a draft first. No invitations are sent.</p>
          <div class="gc-plan-fields">
            <label>
              Session title *
              <input id="gcp-title" maxlength="120"
                placeholder="Global Classroom - Food & Culture">
            </label>
            <label>
              Organizer time zone *
              <select id="gcp-zone">
                ${zones.map(([id,label]) =>
                  `<option value="${id}">${label}</option>`
                ).join('')}
              </select>
            </label>
          </div>
        </section>

        <section data-step="1" hidden>
          <h3>Date and world clocks</h3>
          <p>Times include daylight-saving adjustments.</p>
          <div class="gc-plan-fields">
            <label>
              Session date *
              <input id="gcp-date" type="date">
            </label>
            <label>
              Start time *
              <input id="gcp-time" type="time">
            </label>
            <label>End time *<input id="gcp-end-time" type="time" required></label>
          </div>
          <div class="gc-map-switch">
            <button type="button" id="gcp-view-map">🗺 Map</button>
            <button type="button" id="gcp-view-list">Time list</button>
          </div>
          <div id="gcp-map-panel"></div>
          <div class="gc-plan-clocks" id="gcp-clocks"></div>
        </section>

        <section data-step="2" hidden>
          <h3>Review and save draft</h3>
          <div class="gc-plan-review">
            <div>Session:
              <strong id="gcp-summary-title"></strong>
            </div>
            <div>Local time:
              <strong id="gcp-summary-local"></strong>
            </div>
            <div>UTC:
              <strong id="gcp-summary-utc"></strong>
            </div>
          </div>
          <p id="gcp-success" hidden></p>
          <p id="gcp-event-link" hidden>
            <a href="#/events">Open Event Management →</a>
          </p>
        </section>
      </div>

      <div class="gc-plan-footer">
        <button type="button" class="secondary-button"
          id="gcp-back">← Back</button>
        <p id="gcp-message" role="alert"></p>
        <button type="button" class="primary-button"
          id="gcp-next">Next →</button>
        <button type="button" class="primary-button"
          id="gcp-save" hidden>Save draft event</button>
      </div>
    </section>
  `;
}

export function bindSchedulePlanner() {
  const root = document.querySelector('.gc-plan');
  if (!root) return;
  root.dataset.clockView = 'map';

  for (const [view,id] of [
    ['map','gcp-view-map'],
    ['list','gcp-view-list']
  ]) {
    const button=root.querySelector('#'+id);
    button.addEventListener('click',()=>{
      root.dataset.clockView=view;
      for (const name of ['map','list']) {
        const b=root.querySelector(
          name==='map'?'#gcp-view-map':'#gcp-view-list'
        );
        b.classList.toggle('active',name===view);
        b.setAttribute('aria-pressed',String(name===view));
      }
    });
  }

  root.querySelector('#gcp-view-map').classList.add('active');
  root.querySelector('#gcp-view-map')
    .setAttribute('aria-pressed','true');
  root.querySelector('#gcp-view-list')
    .setAttribute('aria-pressed','false');

  const el = id => root.querySelector('#' + id);
  const title = el('gcp-title');
  const zone = el('gcp-zone');
  const date = el('gcp-date');
  const time = el('gcp-time');
  const endTime = el('gcp-end-time');
  const back = el('gcp-back');
  const next = el('gcp-next');
  const save = el('gcp-save');

  // Step 1: place Next next to the session fields.
  const sessionFields = root.querySelector(
    '[data-step="0"] .gc-plan-fields'
  );

  if (!sessionFields || !next || !save) {
    throw new Error('Session navigation elements not found.');
  }

  const sessionNextArea = document.createElement('div');
  sessionNextArea.className = 'gc-session-next-area';
  sessionFields.after(sessionNextArea);

  const navigationFooter = next.parentElement;

  let step = 0;
  let saved = false;

  const message = text => {
    el('gcp-message').textContent = text;
  };

  const resolve = () => toUTC(
    date.value, time.value, zone.value
  );

  const refreshTimezoneMap = createTimezoneMap(el('gcp-map-panel'), resolve);
  const refreshWorldClocks =
    createWorldClockPanel(el('gcp-clocks'), resolve);

  function clocks() {
    refreshTimezoneMap();
    refreshWorldClocks();
  }

  function render() {
    root.querySelectorAll('[data-step]').forEach(s => {
      s.hidden = Number(s.dataset.step) !== step;
    });

    root.querySelectorAll('[data-tab]').forEach(s => {
      s.classList.toggle(
        'current', Number(s.dataset.tab) === step
      );
    });

    el('gcp-counter').textContent = `Step ${step+1} of 3`;
    el('gcp-progress').style.width =
      `${100*(step+1)/3}%`;

    // Move the same Next button without losing its click listener.
    root.classList.toggle('gc-session-step', step === 0);

    if (step === 0) {
      sessionNextArea.append(next);
    } else {
      navigationFooter.insertBefore(next, save);
    }

    back.disabled = step === 0 || saved;
    next.hidden = step === 2;
    save.hidden = step !== 2 || saved;

    if (step === 1) clocks();

    if (step === 2) {
      const result = resolve();
      el('gcp-summary-title').textContent =
        title.value.trim();
      el('gcp-summary-local').textContent =
        `${date.value} ${time.value}–${endTime.value} (${zone.value})`;
      el('gcp-summary-utc').textContent =
        result.iso || result.error;
    }
  }

  function validate(s) {
    if (s === 0 && !title.value.trim()) {
      message('Enter a session title.');
      title.focus();
      return false;
    }

    if (s === 1) {
      const result = resolve();
      if (result.error) {
        message(result.error);
        return false;
      }
      const duration=makeSlot({date:date.value,startTime:time.value,endTime:endTime.value,timezone:zone.value});
      if(duration.error){message(duration.error);return false;}
      if (Date.parse(result.iso) <= Date.now()) {
        message('Choose a future date and time.');
        return false;
      }
    }

    message('');
    return true;
  }

  back.addEventListener('click', () => {
    if (!saved) {
      step = Math.max(step - 1, 0);
      render();
    }
  });

  next.addEventListener('click', () => {
    if (validate(step)) {
      step = Math.min(step + 1, 2);
      render();
    }
  });

  [date, time, zone].forEach(field => {
    field.addEventListener('change', () => {
      if (step === 1) clocks();
      message('');
    });
  });

  save.addEventListener('click', async () => {
    if (saved || !validate(0) || !validate(1)) return;

    const result = resolve();
    if (!result.iso) return;

    save.disabled = true;
    save.textContent = 'Saving...';

    try {
      const event = await addEvent({
        title: title.value.trim(),
        startsAt: result.iso,
        endsAt: makeSlot({date:date.value,startTime:time.value,endTime:endTime.value,timezone:zone.value}).endsAt,
        timezone: zone.value,
        status: 'draft'
      });

      saved = true;
      el('gcp-success').hidden = false;
      el('gcp-success').textContent =
        `Draft saved (${event.id}). No invitations sent.`;
      el('gcp-event-link').hidden = false;
      render();

    } catch (error) {
      console.error(error);
      message(error.message || 'Could not save draft.');
      save.disabled = false;
      save.textContent = 'Save draft event';
    }
  });

  render();
}