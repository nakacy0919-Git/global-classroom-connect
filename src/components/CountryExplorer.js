import '../styles/countryExplorer.css';

const make = (tag, cls = '', text = '') => {
  const node = document.createElement(tag);
  node.className = cls;
  node.textContent = text;
  return node;
};

const flagUrl = code =>
  `https://flagcdn.com/24x18/${code.toLowerCase()}.png`;

const localTime = (iso, zone) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(new Date(iso));

export function createCountryExplorer(root, getResult, onSelect) {
  const overlay = make('section', 'gc-country-overlay');
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Country directory');

  const header = make('div', 'gc-country-header');
  const title = make('strong', '', 'Country Directory · 197');
  const close = make('button', '', '✕ Close');
  close.type = 'button';
  header.append(title, close);

  const filters = make('div', 'gc-country-filters');

  const search = make('input', 'gc-country-search');
  search.type = 'search';
  search.placeholder = 'Search country / 国名検索';
  search.setAttribute('aria-label', 'Search countries');

  const region = make('select', 'gc-country-region');
  region.setAttribute('aria-label', 'Filter by region');

  const status = make('p', 'gc-country-status');
  filters.append(search, region);

  const content = make('div', 'gc-country-content');
  const list = make('div', 'gc-country-list');
  const details = make('div', 'gc-country-details');
  content.append(list, details);

  overlay.append(header, filters, status, content);
  root.append(overlay);

  let countries = null;
  let selected = null;
  let selectedZone = null;
  let lastFocus = null;

  function closeExplorer() {
    overlay.hidden = true;
    lastFocus?.focus();
  }

  close.addEventListener('click', closeExplorer);

  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeExplorer();
    }
    if (event.key === 'Tab') {
      const controls = [...overlay.querySelectorAll(
        'button:not(:disabled),input:not(:disabled),select:not(:disabled)'
      )].filter(el => el.getClientRects().length);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey &&
                 document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  function renderDetails() {
    details.replaceChildren();

    if (!selected) {
      details.append(make(
        'p', '', 'Choose a country to view local times.'
      ));
      return;
    }

    const heading = make(
      'h3', '', `${selected.name} · ${selected.nameJa}`
    );

    const capital = make(
      'p', 'gc-country-muted',
      `Capital: ${selected.capital || 'Not specified'}`
    );

    const result = getResult();
    const headingZones = make(
      'p', 'gc-country-muted',
      `${selected.zones.length} time zone(s)`
    );

    const zones = make('div', 'gc-country-zones');

    for (const zone of selected.zones) {
      const button = make('button', 'gc-country-zone');
      button.type = 'button';

      if (selectedZone === zone) {
        button.classList.add('active');
      }

      const zoneName = make('span', '', zone);
      const clock = make(
        'strong', '',
        result?.iso
          ? localTime(result.iso, zone)
          : 'Choose session date and time'
      );

      button.append(zoneName, clock);

      button.addEventListener('click', () => {
        selectedZone = zone;
        onSelect(selected, zone);
        renderDetails();
      });

      zones.append(button);
    }

    const hint = make(
      'p', 'gc-country-muted',
      'The map marker shows the country reference point, not the exact location of the selected time zone.'
    );

    details.append(
      heading, capital, headingZones, zones, hint
    );
  }

  function renderList() {
    list.replaceChildren();
    if (!countries) return;

    const query = search.value.trim().toLocaleLowerCase();
    const regionFilter = region.value;

    const matched = countries.filter(country => {
      const text = [
        country.name, country.nameJa,
        country.capital, country.code
      ].join(' ').toLocaleLowerCase();

      return text.includes(query) &&
        (regionFilter === 'All' ||
         country.region === regionFilter);
    });

    status.textContent =
      `${matched.length} countries found · 197 total`;

    for (const country of matched) {
      const button = make('button', 'gc-country-entry');
      button.type = 'button';

      const flag = make('img');
      flag.src = flagUrl(country.code);
      flag.width = 24;
      flag.height = 18;
      flag.alt = '';

      const names = make(
        'span', '', `${country.name} · ${country.nameJa}`
      );

      button.append(flag, names);

      button.addEventListener('click', () => {
        selected = country;
        selectedZone = country.zones[0];
        onSelect(country, selectedZone);
        renderDetails();
      });

      list.append(button);
    }

    if (!matched.length) {
      list.append(make('p', '', 'No matching countries.'));
    }
  }

  search.addEventListener('input', renderList);
  region.addEventListener('change', renderList);

  async function open() {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    search.focus();

    if (!countries) {
      status.textContent = 'Loading country data...';

      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}country-master.json`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.count !== 197 ||
            !Array.isArray(data.countries) ||
            data.countries.length !== 197) {
          throw new Error('Country master is invalid.');
        }

        countries = data.countries;

        for (const name of [
          'All',
          ...new Set(countries.map(c => c.region))
        ]) {
          const option = document.createElement('option');
          option.value = name;
          option.textContent = name;
          region.append(option);
        }

      } catch (error) {
        status.textContent =
          `Country data error: ${error.message}`;
        return;
      }
    }

    renderList();
    renderDetails();
  }

  return { open };
}