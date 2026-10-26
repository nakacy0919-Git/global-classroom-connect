import '../styles/worldClockPanel.css';
import {countryFlagAssetV131} from '../lib/countryFlagAssetsV131.js';

const COUNTRIES = `
Asia|JP|Japan|Asia/Tokyo
Asia|KR|South Korea|Asia/Seoul
Asia|TL|Timor-Leste|Asia/Dili
Asia|PH|Philippines|Asia/Manila
Asia|SG|Singapore|Asia/Singapore
Asia|MY|Malaysia|Asia/Kuala_Lumpur
Asia|CN|China|Asia/Shanghai
Asia|TW|Taiwan|Asia/Taipei
Asia|BN|Brunei|Asia/Brunei
Asia|ID|Indonesia (Bali)|Asia/Makassar
Asia|ID|Indonesia (Jakarta)|Asia/Jakarta
Asia|ID|Indonesia (Papua)|Asia/Jayapura
Asia|VN|Vietnam|Asia/Ho_Chi_Minh
Asia|TH|Thailand|Asia/Bangkok
Asia|KH|Cambodia|Asia/Phnom_Penh
Asia|LA|Laos|Asia/Vientiane
Asia|MM|Myanmar|Asia/Yangon
Asia|BD|Bangladesh|Asia/Dhaka
Asia|NP|Nepal|Asia/Kathmandu
Asia|IN|India|Asia/Kolkata
Asia|LK|Sri Lanka|Asia/Colombo
Asia|PK|Pakistan|Asia/Karachi
Asia|UZ|Uzbekistan|Asia/Tashkent
Asia|AF|Afghanistan|Asia/Kabul
Middle East|AE|United Arab Emirates|Asia/Dubai
Middle East|OM|Oman|Asia/Muscat
Middle East|SA|Saudi Arabia|Asia/Riyadh
Middle East|QA|Qatar|Asia/Qatar
Middle East|KW|Kuwait|Asia/Kuwait
Middle East|BH|Bahrain|Asia/Bahrain
Middle East|IQ|Iraq|Asia/Baghdad
Middle East|IR|Iran|Asia/Tehran
Middle East|TR|Turkey|Europe/Istanbul
Middle East|JO|Jordan|Asia/Amman
Middle East|IL|Israel|Asia/Jerusalem
Middle East|LB|Lebanon|Asia/Beirut
Africa|EG|Egypt|Africa/Cairo
Africa|ZA|South Africa|Africa/Johannesburg
Africa|KE|Kenya|Africa/Nairobi
Africa|TZ|Tanzania|Africa/Dar_es_Salaam
Africa|UG|Uganda|Africa/Kampala
Africa|ET|Ethiopia|Africa/Addis_Ababa
Africa|RW|Rwanda|Africa/Kigali
Africa|NG|Nigeria|Africa/Lagos
Africa|GH|Ghana|Africa/Accra
Africa|MA|Morocco|Africa/Casablanca
Africa|DZ|Algeria|Africa/Algiers
Africa|TN|Tunisia|Africa/Tunis
Africa|SN|Senegal|Africa/Dakar
Europe|GB|United Kingdom|Europe/London
Europe|IE|Ireland|Europe/Dublin
Europe|FR|France|Europe/Paris
Europe|DE|Germany|Europe/Berlin
Europe|ES|Spain|Europe/Madrid
Europe|PT|Portugal|Europe/Lisbon
Europe|IT|Italy|Europe/Rome
Europe|NL|Netherlands|Europe/Amsterdam
Europe|PL|Poland|Europe/Warsaw
Europe|CH|Switzerland|Europe/Zurich
Europe|FI|Finland|Europe/Helsinki
Europe|GR|Greece|Europe/Athens
Europe|UA|Ukraine|Europe/Kyiv
Americas|US|USA (New York)|America/New_York
Americas|US|USA (Chicago)|America/Chicago
Americas|US|USA (Los Angeles)|America/Los_Angeles
Americas|CA|Canada (Toronto)|America/Toronto
Americas|CA|Canada (Vancouver)|America/Vancouver
Americas|MX|Mexico|America/Mexico_City
Americas|CO|Colombia|America/Bogota
Americas|PE|Peru|America/Lima
Americas|EC|Ecuador|America/Guayaquil
Americas|BR|Brazil (São Paulo)|America/Sao_Paulo
Americas|AR|Argentina|America/Argentina/Buenos_Aires
Americas|CL|Chile|America/Santiago
Americas|CR|Costa Rica|America/Costa_Rica
Oceania|AU|Australia (Sydney)|Australia/Sydney
Oceania|AU|Australia (Perth)|Australia/Perth
Oceania|NZ|New Zealand|Pacific/Auckland
Oceania|FJ|Fiji|Pacific/Fiji
Oceania|PG|Papua New Guinea|Pacific/Port_Moresby
Oceania|WS|Samoa|Pacific/Apia
Oceania|TO|Tonga|Pacific/Tongatapu
Oceania|VU|Vanuatu|Pacific/Efate
`.trim().split('\n').map(line => {
  const [region, code, name, zone] = line.split('|');
  return { region, code, name, zone };
});

const HOST_ZONE_IDS = [
  'Asia/Tokyo', 'Asia/Manila', 'Asia/Ho_Chi_Minh',
  'Asia/Jakarta', 'Asia/Makassar', 'Asia/Kolkata',
  'Asia/Colombo', 'Asia/Kathmandu', 'Asia/Singapore',
  'Asia/Kuala_Lumpur', 'Asia/Bangkok', 'Asia/Shanghai',
  'Asia/Dhaka', 'Asia/Yangon', 'Asia/Dubai',
  'Asia/Riyadh', 'Asia/Tehran', 'Asia/Jerusalem',
  'Africa/Cairo', 'Africa/Johannesburg',
  'Africa/Nairobi', 'Africa/Lagos', 'Africa/Accra',
  'Africa/Casablanca', 'Europe/London',
  'Europe/Paris', 'Europe/Berlin', 'Europe/Istanbul',
  'America/New_York', 'America/Chicago',
  'America/Los_Angeles', 'America/Toronto',
  'America/Mexico_City', 'America/Sao_Paulo',
  'Australia/Sydney', 'Australia/Perth',
  'Pacific/Auckland'
];

export const organizerZones = HOST_ZONE_IDS.map(zone => {
  const location = COUNTRIES.find(c => c.zone === zone);
  return [zone, location ? location.name : zone];
});

const REGIONS = [
  'Asia', 'Middle East', 'Africa',
  'Europe', 'Americas', 'Oceania', 'All'
];

const formatterCache = new Map();

function localTime(iso, zone) {
  let formatter = formatterCache.get(zone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    });
    formatterCache.set(zone, formatter);
  }

  const instant = new Date(iso);
  const fields = Object.fromEntries(
    formatter.formatToParts(instant)
      .filter(p => p.type !== 'literal')
      .map(p => [p.type, p.value])
  );

  const localAsUTC = Date.UTC(
    Number(fields.year),
    Number(fields.month) - 1,
    Number(fields.day),
    Number(fields.hour),
    Number(fields.minute)
  );

  return {
    offset: Math.round(
      (localAsUTC - instant.getTime()) / 60000
    ),
    hour: Number(fields.hour),
    minute: Number(fields.minute),
    timeText: `${fields.hour}:${fields.minute}`,
    dateText: `${fields.weekday} ${Number(fields.day)}/${Number(fields.month)}`
  };
}

function offsetLabel(minutes) {
  const sign = minutes >= 0 ? '+' : '-';
  const value = Math.abs(minutes);

  return `UTC${sign}${String(
    Math.floor(value / 60)
  ).padStart(2, '0')}:${String(
    value % 60
  ).padStart(2, '0')}`;
}

function item(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function createAnalogClock(iso, offset) {
  const local = new Date(
    new Date(iso).getTime() + offset * 60000
  );

  const hour = local.getUTCHours();
  const minute = local.getUTCMinutes();
  const night = hour < 6 || hour >= 18;

  const face = document.createElement('div');
  face.className =
    `gc-clock-face ${night ? 'gc-clock-night' : 'gc-clock-day'}`;

  face.setAttribute('role', 'img');
  face.setAttribute(
    'aria-label',
    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${night ? 'night' : 'daytime'}`
  );

  for (const number of [12, 3, 6, 9]) {
    const mark = document.createElement('span');
    mark.className = `gc-clock-number gc-clock-n${number}`;
    mark.textContent = String(number);
    face.append(mark);
  }

  const hourHand = document.createElement('span');
  hourHand.className = 'gc-clock-hand gc-clock-hour';
  hourHand.style.transform =
    `translateX(-50%) rotate(${(hour % 12) * 30 + minute * 0.5}deg)`;

  const minuteHand = document.createElement('span');
  minuteHand.className = 'gc-clock-hand gc-clock-minute';
  minuteHand.style.transform =
    `translateX(-50%) rotate(${minute * 6}deg)`;

  const center = document.createElement('span');
  center.className = 'gc-clock-center';

  face.append(hourHand, minuteHand, center);
  return face;
}
export function createWorldClockPanel(grid, getResult) {
  grid.classList.add('gc-world-grid');

  const toolbar = document.createElement('div');
  toolbar.className = 'gc-world-tools';

  const tabs = document.createElement('div');
  tabs.className = 'gc-world-regions';
  tabs.setAttribute('aria-label', 'Filter by region');

  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'gc-world-search';
  search.placeholder = 'Search a country or city';
  search.setAttribute('aria-label', 'Search country or city');

  const summary = item('p', 'gc-world-summary', '');

  toolbar.append(tabs, search, summary);
  grid.before(toolbar);

  const pager = document.createElement('div');
  pager.className = 'gc-world-pagination';
  grid.after(pager);

  let region = 'Asia';
  let page = 0;
  const pageSize = 6;

  for (const name of REGIONS) {
    const button = item('button', 'gc-world-region', name);
    button.type = 'button';

    button.addEventListener('click', () => {
      region = name;
      page = 0;
      refresh();
    });

    tabs.append(button);
  }

  search.addEventListener('input', () => {
    page = 0;
    refresh();
  });

  function refresh() {
    for (const button of tabs.querySelectorAll('button')) {
      const selected = button.textContent === region;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }

    grid.replaceChildren();
    pager.replaceChildren();

    const result = getResult();

    if (!result || result.error || !result.iso) {
      summary.textContent = 'Choose a valid date and time.';
      grid.append(
        item('p', 'gc-world-empty',
          result?.error || 'Choose a date and time.')
      );
      return;
    }

    const query = search.value.trim().toLocaleLowerCase();

    const available = COUNTRIES.filter(country =>
      (region === 'All' || country.region === region) &&
      (!query ||
        `${country.name} ${country.zone}`
          .toLocaleLowerCase().includes(query))
    );

    const groups = new Map();

    for (const country of available) {
      const time = localTime(result.iso, country.zone);

      if (!groups.has(time.offset)) {
        groups.set(time.offset, {
          ...time,
          countries: []
        });
      }

      groups.get(time.offset).countries.push(country);
    }

    summary.textContent =
      `${available.length} places · ${groups.size} local times`;

    if (!groups.size) {
      grid.append(item(
        'p', 'gc-world-empty',
        'No matching country or region.'
      ));
      return;
    }

    const sorted = [...groups.values()]
      .sort((a, b) => b.offset - a.offset);

    const pageCount = Math.max(
      1, Math.ceil(sorted.length / pageSize)
    );
    page = Math.min(page, pageCount - 1);

    if (pageCount > 1) {
      const previous = item(
        'button', 'gc-world-page-button', '← Previous'
      );
      const indicator = item(
        'span', 'gc-world-page-label',
        `Page ${page + 1} / ${pageCount}`
      );
      const following = item(
        'button', 'gc-world-page-button', 'Next →'
      );

      previous.type = 'button';
      following.type = 'button';
      previous.disabled = page === 0;
      following.disabled = page === pageCount - 1;

      previous.addEventListener('click', () => {
        page--;
        refresh();
      });
      following.addEventListener('click', () => {
        page++;
        refresh();
      });

      pager.append(previous, indicator, following);
    }

    for (const group of sorted.slice(
      page * pageSize, (page + 1) * pageSize
    )) {
      const card = document.createElement('section');
      card.className = 'gc-world-card';

      const head = document.createElement('div');
      head.className = 'gc-world-card-head';

      const clockLine = document.createElement('div');
      clockLine.className = 'gc-world-clockline';

      const dateTime = document.createElement('div');
      dateTime.className = 'gc-world-datetime';
      dateTime.append(
        item('strong', 'gc-world-time-big', group.timeText),
        item('span', 'gc-world-date-small', group.dateText)
      );

      clockLine.append(
        createAnalogClock(result.iso, group.offset),
        dateTime
      );

      head.append(
        item('strong', 'gc-world-offset',
          offsetLabel(group.offset)),
        clockLine
      );

      const countries = document.createElement('div');
      countries.className = 'gc-world-countries';

      const ordered = group.countries.sort(
        (a, b) => a.name.localeCompare(b.name)
      );

      for (const country of ordered) {
        const pill = document.createElement('span');
        pill.className = 'gc-world-country';

        const flag = document.createElement('img');
        flag.src=countryFlagAssetV131(country.name,country.code);
        flag.alt = `${country.name} flag`;
        flag.width = 24;
        flag.height = 18;
        flag.loading = 'lazy';

        pill.append(
          flag,
          document.createTextNode(country.name)
        );

        countries.append(pill);
      }

      card.append(head, countries);
      grid.append(card);
    }
  }

  return refresh;
}