import '../styles/worldTimezoneMap.css';
import { createCountryExplorer } from './CountryExplorer.js';

const RAW = `
Asia|JP|Japan|Tokyo|Asia/Tokyo|35.68|139.76
Asia|KR|South Korea|Seoul|Asia/Seoul|37.57|126.98
Asia|CN|China|Shanghai|Asia/Shanghai|31.23|121.47
Asia|TW|Taiwan|Taipei|Asia/Taipei|25.03|121.56
Asia|PH|Philippines|Manila|Asia/Manila|14.60|120.98
Asia|VN|Vietnam|Ho Chi Minh City|Asia/Ho_Chi_Minh|10.82|106.63
Asia|TH|Thailand|Bangkok|Asia/Bangkok|13.75|100.50
Asia|SG|Singapore|Singapore|Asia/Singapore|1.35|103.82
Asia|MY|Malaysia|Kuala Lumpur|Asia/Kuala_Lumpur|3.14|101.69
Asia|ID|Indonesia|Jakarta|Asia/Jakarta|-6.20|106.85
Asia|ID|Indonesia|Bali|Asia/Makassar|-8.65|115.22
Asia|ID|Indonesia|Jayapura|Asia/Jayapura|-2.53|140.72
Asia|IN|India|New Delhi|Asia/Kolkata|28.61|77.21
Asia|LK|Sri Lanka|Colombo|Asia/Colombo|6.93|79.86
Asia|NP|Nepal|Kathmandu|Asia/Kathmandu|27.71|85.32
Asia|BD|Bangladesh|Dhaka|Asia/Dhaka|23.81|90.41
Asia|MM|Myanmar|Yangon|Asia/Yangon|16.87|96.20
Asia|RU|Russia|Novosibirsk|Asia/Novosibirsk|55.03|82.92
Asia|RU|Russia|Vladivostok|Asia/Vladivostok|43.12|131.89
Asia|MN|Mongolia|Ulaanbaatar|Asia/Ulaanbaatar|47.92|106.92
Middle East|AE|United Arab Emirates|Dubai|Asia/Dubai|25.20|55.27
Middle East|SA|Saudi Arabia|Riyadh|Asia/Riyadh|24.71|46.67
Middle East|OM|Oman|Muscat|Asia/Muscat|23.59|58.41
Middle East|QA|Qatar|Doha|Asia/Qatar|25.29|51.53
Middle East|IR|Iran|Tehran|Asia/Tehran|35.69|51.39
Middle East|IQ|Iraq|Baghdad|Asia/Baghdad|33.31|44.36
Middle East|IL|Israel|Jerusalem|Asia/Jerusalem|31.77|35.21
Middle East|TR|Turkey|Istanbul|Europe/Istanbul|41.01|28.97
Africa|EG|Egypt|Cairo|Africa/Cairo|30.04|31.24
Africa|MA|Morocco|Casablanca|Africa/Casablanca|33.57|-7.59
Africa|DZ|Algeria|Algiers|Africa/Algiers|36.75|3.06
Africa|NG|Nigeria|Lagos|Africa/Lagos|6.45|3.39
Africa|GH|Ghana|Accra|Africa/Accra|5.56|-0.20
Africa|KE|Kenya|Nairobi|Africa/Nairobi|-1.29|36.82
Africa|TZ|Tanzania|Dar es Salaam|Africa/Dar_es_Salaam|-6.79|39.21
Africa|ET|Ethiopia|Addis Ababa|Africa/Addis_Ababa|8.98|38.79
Africa|ZA|South Africa|Johannesburg|Africa/Johannesburg|-26.20|28.04
Africa|SN|Senegal|Dakar|Africa/Dakar|14.69|-17.45
Africa|CI|Cote d'Ivoire|Abidjan|Africa/Abidjan|5.36|-4.01
Africa|CM|Cameroon|Yaounde|Africa/Douala|3.85|11.52
Africa|CD|DR Congo|Kinshasa|Africa/Kinshasa|-4.32|15.31
Africa|AO|Angola|Luanda|Africa/Luanda|-8.84|13.23
Africa|ZM|Zambia|Lusaka|Africa/Lusaka|-15.41|28.29
Africa|ZW|Zimbabwe|Harare|Africa/Harare|-17.83|31.05
Africa|BW|Botswana|Gaborone|Africa/Gaborone|-24.63|25.91
Africa|NA|Namibia|Windhoek|Africa/Windhoek|-22.56|17.08
Africa|MZ|Mozambique|Maputo|Africa/Maputo|-25.97|32.58
Africa|UG|Uganda|Kampala|Africa/Kampala|0.31|32.58
Africa|RW|Rwanda|Kigali|Africa/Kigali|-1.95|30.06
Europe|GB|United Kingdom|London|Europe/London|51.51|-0.13
Europe|IE|Ireland|Dublin|Europe/Dublin|53.35|-6.26
Europe|FR|France|Paris|Europe/Paris|48.86|2.35
Europe|DE|Germany|Berlin|Europe/Berlin|52.52|13.40
Europe|ES|Spain|Madrid|Europe/Madrid|40.42|-3.70
Europe|PT|Portugal|Lisbon|Europe/Lisbon|38.72|-9.14
Europe|IT|Italy|Rome|Europe/Rome|41.90|12.50
Europe|NL|Netherlands|Amsterdam|Europe/Amsterdam|52.37|4.90
Europe|FI|Finland|Helsinki|Europe/Helsinki|60.17|24.94
Europe|RU|Russia|Moscow|Europe/Moscow|55.76|37.62
Europe|RU|Russia|Saint Petersburg|Europe/Moscow|59.93|30.33
Europe|UA|Ukraine|Kyiv|Europe/Kyiv|50.45|30.52
Europe|PL|Poland|Warsaw|Europe/Warsaw|52.23|21.01
Europe|CH|Switzerland|Zurich|Europe/Zurich|47.37|8.54
Europe|GR|Greece|Athens|Europe/Athens|37.98|23.73
Americas|US|United States|New York|America/New_York|40.71|-74.01
Americas|US|United States|Chicago|America/Chicago|41.88|-87.63
Americas|US|United States|Los Angeles|America/Los_Angeles|34.05|-118.24
Americas|CA|Canada|Toronto|America/Toronto|43.65|-79.38
Americas|CA|Canada|Vancouver|America/Vancouver|49.28|-123.12
Americas|MX|Mexico|Mexico City|America/Mexico_City|19.43|-99.13
Americas|CO|Colombia|Bogota|America/Bogota|4.71|-74.07
Americas|BR|Brazil|Sao Paulo|America/Sao_Paulo|-23.55|-46.63
Americas|AR|Argentina|Buenos Aires|America/Argentina/Buenos_Aires|-34.60|-58.38
Americas|CL|Chile|Santiago|America/Santiago|-33.45|-70.67
Americas|PE|Peru|Lima|America/Lima|-12.05|-77.04
Americas|EC|Ecuador|Quito|America/Guayaquil|-0.18|-78.47
Americas|BO|Bolivia|La Paz|America/La_Paz|-16.50|-68.15
Americas|PY|Paraguay|Asuncion|America/Asuncion|-25.27|-57.64
Americas|UY|Uruguay|Montevideo|America/Montevideo|-34.90|-56.16
Americas|VE|Venezuela|Caracas|America/Caracas|10.48|-66.90
Americas|GT|Guatemala|Guatemala City|America/Guatemala|14.63|-90.55
Americas|PA|Panama|Panama City|America/Panama|8.98|-79.52
Oceania|AU|Australia|Sydney|Australia/Sydney|-33.87|151.21
Oceania|AU|Australia|Perth|Australia/Perth|-31.95|115.86
Oceania|NZ|New Zealand|Auckland|Pacific/Auckland|-36.85|174.76
Oceania|PG|Papua New Guinea|Port Moresby|Pacific/Port_Moresby|-9.44|147.18
Oceania|FJ|Fiji|Suva|Pacific/Fiji|-18.14|178.44
Oceania|WS|Samoa|Apia|Pacific/Apia|-13.83|-171.76
`.trim();

const PLACES = RAW.split('\n').map(line => {
  const [region,code,country,city,zone,lat,lon] = line.split('|');
  return {
    region,code,country,city,zone,
    lat:Number(lat),lon:Number(lon)
  };
});

const REGIONS = [
  'All','Asia','Middle East','Africa',
  'Europe','Americas','Oceania'
];

const NS = 'http://www.w3.org/2000/svg';

const svgElement = tag =>
  document.createElementNS(NS, tag);

const xy = ([lon,lat]) => [
  Number(((lon + 180) / 360 * 1000).toFixed(2)),
  Number(((90 - lat) / 180 * 500).toFixed(2))
];

function shapePath(geometry) {
  const polygons = geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : [];

  return polygons.map(poly =>
    poly.map(ring => {
      if (!ring.length) return '';
      return ring.map((p,i) =>
        `${i ? 'L' : 'M'}${xy(p).join(',')}`
      ).join(' ') + ' Z';
    }).join(' ')
  ).join(' ');
}

function localInfo(iso,zone) {
  const instant = new Date(iso);
  const formatter = new Intl.DateTimeFormat('en-GB',{
    timeZone:zone,
    year:'numeric',month:'2-digit',day:'2-digit',
    weekday:'short',hour:'2-digit',minute:'2-digit',
    hourCycle:'h23'
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(instant)
      .filter(p => p.type !== 'literal')
      .map(p => [p.type,p.value])
  );

  const local = Date.UTC(
    Number(parts.year),Number(parts.month)-1,
    Number(parts.day),Number(parts.hour),
    Number(parts.minute)
  );

  const offset = Math.round(
    (local-instant.getTime())/60000
  );

  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);

  return {
    hour:Number(parts.hour),
    time:`${parts.hour}:${parts.minute}`,
    day:`${parts.weekday} ${Number(parts.day)}/${Number(parts.month)}`,
    dateKey:`${parts.year}-${parts.month}-${parts.day}`,
    offset:`UTC${sign}${String(Math.floor(abs/60)).padStart(2,'0')}:${String(abs%60).padStart(2,'0')}`
  };
}

function element(tag,cls,content='') {
  const node=document.createElement(tag);
  node.className=cls;
  node.textContent=content;
  return node;
}

export function createTimezoneMap(target,getResult) {
  if (!target) return () => {};

  target.className='gc-map-shell';

  const filters=element('div','gc-map-filters');
  const area=element('div','gc-map-area');
  const stage=element('div','gc-map-stage');
  const detail=element('aside','gc-map-detail');

  const svg=svgElement('svg');
  svg.setAttribute('viewBox','0 0 1000 500');
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  svg.setAttribute('role','img');
  svg.setAttribute(
    'aria-label','World map of local session times'
  );

  const land=svgElement('g');
  land.setAttribute('class','gc-map-country-layer');

  const pins=svgElement('g');
  pins.setAttribute('class','gc-map-pins');

  // Reference meridians, not legal time-zone boundaries.
  const guides = svgElement('g');
  guides.setAttribute('class','gc-map-meridian-layer');

  for (let longitude = -180; longitude <= 180; longitude += 15) {
    const isDateLine = Math.abs(longitude) === 180;
    const isPrime = longitude === 0;

    const x = isDateLine
      ? (longitude < 0 ? 3 : 997)
      : ((longitude + 180) / 360) * 1000;

    const line = svgElement('line');
    line.setAttribute('x1',String(x));
    line.setAttribute('x2',String(x));
    line.setAttribute('y1','4');
    line.setAttribute('y2','496');

    line.setAttribute(
      'class',
      isDateLine
        ? 'gc-map-date-meridian'
        : isPrime
          ? 'gc-map-zero-meridian'
          : 'gc-map-meridian'
    );

    guides.append(line);

    // Label selected longitudes without overcrowding the map.
    if (longitude % 60 === 0 && !isDateLine) {
      const label = svgElement('text');
      label.setAttribute('x',String(x));
      label.setAttribute('y','19');
      label.setAttribute('text-anchor','middle');
      label.setAttribute('class','gc-map-meridian-label');

      label.textContent = longitude === 0
        ? '0°'
        : `${Math.abs(longitude)}°${longitude < 0 ? 'W' : 'E'}`;

      guides.append(label);
    }
  }

  // Keep country boundaries visible, with guide lines above
  // the land and clickable location markers above both.
  svg.append(land,guides,pins);
  stage.append(svg);

  const guideLegend = element(
    'div',
    'gc-map-guide-legend',
    'Blue: 15° longitude guides · Red: date line reference'
  );
  stage.append(guideLegend);
  area.append(stage,detail);
  target.replaceChildren(filters,area);

  let active='All';
  let selected=PLACES[0];
  let countrySelection=null;

  const explorer=createCountryExplorer(
    target, getResult, (country,zone) => {
      countrySelection={
        country:country.name,
        city:'Country reference point',
        code:country.code,
        zone,
        lat:country.lat,
        lon:country.lon
      };
      draw();
    }
  );

  function showDetail(place,result) {
    detail.replaceChildren();

    if (!place || !result?.iso) {
      detail.append(element(
        'p','','Choose a valid date and time.'
      ));
      return;
    }

    const t=localInfo(result.iso,place.zone);
    const hostDate = document.querySelector('#gcp-date')?.value;

    let dayShift = 'Same date as organizer';

    if (hostDate && t.dateKey !== hostDate) {
      dayShift = t.dateKey < hostDate
        ? '← Previous day compared with organizer'
        : 'Next day compared with organizer →';
    }

    const top=element('div','gc-map-place');

    const flag=document.createElement('img');
    flag.src=`https://flagcdn.com/48x36/${place.code.toLowerCase()}.png`;
    flag.width=48;
    flag.height=36;
    flag.alt=`${place.country} flag`;

    top.append(flag,element(
      'strong','',`${place.country} · ${place.city}`
    ));

    detail.append(
      top,
      element('div','gc-map-big-time',t.time),
      element('p','gc-map-day-status',dayShift),
      element('p','gc-map-small-date',t.day),
      element('p','gc-map-offset',
        `${t.offset} · ${place.zone}`),
      element('p','gc-map-phase',
        t.hour<6 || t.hour>=18
          ? '● Evening / Night'
          : '☀ Daytime')
    );
  }

  function draw() {
    const result=getResult();
    filters.replaceChildren();

    for (const region of REGIONS) {
      const button=element(
        'button',
        'gc-map-filter'+(active===region?' active':''),
        region
      );

      button.type='button';
      button.setAttribute(
        'aria-pressed',String(active===region)
      );

      button.addEventListener('click',()=>{
        active=region;
        draw();
      });

      filters.append(button);
    }

    const directoryButton=element(
      'button',
      'gc-map-filter gc-map-country-trigger',
      '🔎 Countries (197)'
    );
    directoryButton.type='button';
    directoryButton.addEventListener(
      'click', () => explorer.open()
    );
    filters.append(directoryButton);

    pins.replaceChildren();

    if (result?.error || !result?.iso) {
      showDetail(null,null);
      return;
    }

    const visible=PLACES.filter(p =>
      active==='All' || p.region===active
    );

    if (!visible.includes(selected)) {
      selected=visible[0];
    }

    for (const place of visible) {
      const [x,y]=xy([place.lon,place.lat]);
      const t=localInfo(result.iso,place.zone);

      const marker=svgElement('circle');

      marker.setAttribute('cx',String(x));
      marker.setAttribute('cy',String(y));
      marker.setAttribute(
        'r',place===selected?'7':'5'
      );

      const daytime=t.hour>=6 && t.hour<18;

      marker.setAttribute(
        'class',
        'gc-map-pin '+
        (daytime?'gc-map-pin-day':'gc-map-pin-night')+
        (place===selected?' selected':'')
      );

      marker.setAttribute('tabindex','0');
      marker.setAttribute('role','button');
      marker.setAttribute('aria-label',
        `${place.country}, ${place.city}: ${t.time}`
      );

      const tooltip=svgElement('title');
      tooltip.textContent=
        `${place.country} (${place.city}): ${t.time}`;
      marker.append(tooltip);

      marker.addEventListener('click',()=>{
        selected=place;
        countrySelection=null;
        draw();
      });

      marker.addEventListener('keydown',ev=>{
        if (ev.key==='Enter' || ev.key===' ') {
          ev.preventDefault();
          selected=place;
          countrySelection=null;
          draw();
        }
      });

      marker.addEventListener('mouseenter',()=>{
        showDetail(place,result);
      });

      pins.append(marker);
    }

    if (countrySelection && result?.iso) {
      const [cx,cy]=xy([
        countrySelection.lon,
        countrySelection.lat
      ]);

      const countryPin=svgElement('circle');
      countryPin.setAttribute('cx',String(cx));
      countryPin.setAttribute('cy',String(cy));
      countryPin.setAttribute('r','9');
      countryPin.setAttribute(
        'class','gc-map-pin selected'
      );
      countryPin.setAttribute('fill','#f28c47');

      const tooltip=svgElement('title');
      tooltip.textContent=countrySelection.country;
      countryPin.append(tooltip);

      pins.append(countryPin);
    }

    showDetail(countrySelection || selected,result);
  }

  // 実際の国境を含むGeoJSON
  fetch(`${import.meta.env.BASE_URL}world.geojson`)
    .then(response=>{
      if (!response.ok) {
        throw Error(`Map HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(data=>{
      if (data.type!=='FeatureCollection' ||
          !Array.isArray(data.features) ||
          data.features.length<100) {
        throw Error('Invalid map data');
      }

      const fragment=document.createDocumentFragment();

      for (const country of data.features) {
        if (!country.geometry) continue;

        const path=svgElement('path');
        path.setAttribute(
          'd',shapePath(country.geometry)
        );

        const name=svgElement('title');
        name.textContent=
          country.properties?.name || 'Country';

        path.append(name);
        fragment.append(path);
      }

      land.replaceChildren(fragment);
    })
    .catch(error=>{
      console.error('Map loading failed:',error);
      stage.append(element(
        'p','gc-map-load-error',
        'Map data could not be loaded.'
      ));
    });

  draw();
  return draw;
}