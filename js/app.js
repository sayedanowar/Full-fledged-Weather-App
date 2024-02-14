import { fetchData, url } from "./api.js";
import * as module from "./module.js";

const addEventOnElements = function (elements, eventType, callback) {
    for (const element of elements) element.addEventListener(eventType, callback)
}

const searchView = document.querySelector("[data-search-view]");
const searchTogglers = document.querySelectorAll("[data-search-toggler]");

const toggleSearch = () => searchView.classList.toggle("active");
addEventOnElements(searchTogglers, "click", toggleSearch);

const searchField = document.querySelector("[data-search-field]");
const searchResult = document.querySelector("[data-search-result]");

let searchTimeout = null
const searchTimeoutDuration = 500;

searchField.addEventListener("input", function () {
    searchTimeout ?? clearTimeout(searchTimeout);
    if (!searchField.value) {
        searchResult.classList.remove("active");
        searchResult.innerHTML = "";
        searchField.classList.remove("searching");
    } else {
        searchField.classList.add("searching");
    }

    if (searchField.value) {
        searchTimeout = setTimeout(() => {
            fetchData(url.geo(searchField.value), function (locations) {
                searchField.classList.remove("searching");
                searchResult.classList.add("active");
                searchResult.innerHTML = `<ul class="view_list" data-search-list></ul>`;
                const items = [];
                for (const { name, lat, lon, country, state } of locations) {
                    const searchItem = document.createElement("li");
                    searchItem.classList.add("view_item");
                    searchItem.innerHTML = `
                        <span class="m_icon">location_on</span>
                        <div>
                            <p class="item_title">${name}</p>
                            <p class="label_2 item_subtitle">${state || ""} ${country}</p>
                        </div>
                        <a href="#/weather?lat=${lat}&lon=${lon}" class="item_link has_state" data-search-toggler></a>
                    `;
                    searchResult.querySelector("[data-search-list]").appendChild(searchItem);
                    items.push(searchItem.querySelector("[data-search-toggler]"));
                }
                addEventOnElements(items, "click", function () {
                    toggleSearch();
                    searchResult.classList.remove("active");
                });
            });
        }, searchTimeoutDuration);
    }
});

const container = document.querySelector("[data-container]");
const loading = document.querySelector("[data-loading]");
const currentLocationBtn = document.querySelector("[data-current-location-btn]");
const errorContent = document.querySelector("[data-error-content]");

export const updateWeather = function (lat, lon) {
    loading.style.display = "grid";
    container.style.overflowY = "hidden";
    container.classList.remove("fade-in");
    errorContent.style.display = "none";

    const currentWeatherSection = document.querySelector("[data-current-weather]");
    const highlightSection = document.querySelector("[data-highlights]");
    const hourlySection = document.querySelector("[data-hourly-forecast]");
    const forecastSection = document.querySelector("[data-5-day-forecast]");

    currentWeatherSection.innerHTML = "";
    highlightSection.innerHTML = "";
    hourlySection.innerHTML = "";
    forecastSection.innerHTML = "";

    if (window.location.hash === "#/current-location") {
        currentLocationBtn.setAttribute("disabled", "");
    } else {
        currentLocationBtn.removeAttribute("disabled");
    }

    fetchData(url.currentWeather(lat, lon), function (currentWeather) {
        const {
            weather,
            dt: dateUnix,
            sys: { sunrise: sunriseUnixUTC, sunset: sunsetUnixUTC },
            main: { temp, feels_like, pressure, humidity },
            visibility,
            timezone
        } = currentWeather
        const [{ description, icon }] = weather;

        const card = document.createElement("div");
        card.classList.add("card", "card_lg", "current_weather_card");

        card.innerHTML = `
            <h2 class="title_2 card_title">Now</h2>
            <div class="weapper">
                <p class="heading">${parseInt(temp)}&deg;<sup>c</sup></p>
                <img src="/icons/${icon}.png" width="64" height="64" alt="${description}" class="weather_icon">
            </div>
            <p class="body_3">${description}</p>
            <ul class="meta_list">
                <li class="meta_item">
                    <span class="m_icon">calendar_today</span>
                    <p class="title_3 meta_text">${module.getDate(dateUnix, timezone)}</p>
                </li>
                <li class="meta_item">
                    <span class="m_icon">schedule</span>
                    <p class="title_3 meta_text">${module.getTime(dateUnix, timezone)}</p>
                </li>
                <li class="meta_item">
                    <span class="m_icon">location_on</span>
                    <p class="title_3 meta_text" data-location></p>
                </li>
            </ul>
        `;

        fetchData(url.reverseGeo(lat, lon), function ([{ name, country }]) {
            card.querySelector("[data-location]").innerHTML = `${name}, ${country}`
        });

        currentWeatherSection.appendChild(card);

        fetchData(url.airPollution(lat, lon), function (airPollution) {
            const [{
                main: { aqi },
                components: { no2, o3, so2, pm2_5 }
            }] = airPollution.list;
            const card = document.createElement("div");
            card.classList.add("card", "card_lg");

            card.innerHTML = `
                <div class="highlight_list">
                    <div class="card card_sm highlight_card one">
                        <h3 class="title_3">Air Quality</h3>
                        <div class="wrapper">
                            <span class="m_icon">air</span>
                            <ul class="card_list">
                                <li class="card_item">
                                    <p class="title_1">${pm2_5.toPrecision(3)}</p>
                                    <p class="label_1">PM<sub>2.5</sub></p>
                                </li>
                                <li class="card_item">
                                    <p class="title_1">${so2.toPrecision(3)}</p>
                                    <p class="label_1">SO<sub>2</sub></p>
                                </li>
                                <li class="card_item">
                                    <p class="title_1">${no2.toPrecision(3)}</p>
                                    <p class="label_1">NO<sub>2</sub></p>
                                </li>
                                <li class="card_item">
                                    <p class="title_1">${o3.toPrecision(3)}</p>
                                    <p class="label_1">O<sub>3</sub></p>
                                </li>
                            </ul>
                        </div>
                        <span class="badge aqi_${aqi} label_${aqi}" title="${module.aqiText[aqi].message}">${module.aqiText[aqi].level}</span>
                    </div>
                    <div class="card card_sm highlight_card two">
                        <h3 class="title_3">Sunrise & Sunset</h3>
                        <div class="card_list">
                            <div class="card_item">
                                <span class="m_icon">clear_day</span>
                                <div>
                                    <p class="label_1">Sunrise</p>
                                    <p class="title_1">${module.getTime(sunriseUnixUTC, timezone)}</p>
                                </div>
                            </div>
                            <div class="card_item">
                                <span class="m_icon">clear_night</span>
                                <div>
                                    <p class="label_1">Sunset</p>
                                    <p class="title_1">${module.getTime(sunsetUnixUTC, timezone)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card card_sm highlight_card">
                        <h3 class="title_3">Humidity</h3>
                        <div class="wrapper">
                            <span class="m_icon">humidity_percentage</span>
                            <p class="title_1">${humidity}<sub>%</sub></p>
                        </div>
                    </div>
                    <div class="card card_sm highlight_card">
                        <h3 class="title_3">Pressure</h3>
                        <div class="wrapper">
                            <span class="m_icon">airwave</span>
                            <p class="title_1">${pressure}<sub>hPa</sub></p>
                        </div>
                    </div>
                    <div class="card card_sm highlight_card">
                        <h3 class="title_3">Visibility</h3>
                        <div class="wrapper">
                            <span class="m_icon">visibility</span>
                            <p class="title_1">${visibility / 1000}<sub>km</sub></p>
                        </div>
                    </div>
                    <div class="card card_sm highlight_card">
                        <h3 class="title_3">Feels Like</h3>
                        <div class="wrapper">
                            <span class="m_icon">thermostat</span>
                            <p class="title_1">${parseInt(feels_like)}&deg;<sup>c</sup></p>
                        </div>
                    </div>
                </div>
            `

            highlightSection.appendChild(card);
        });

        fetchData(url.forecast(lat, lon), function (forecast) {
            const {
                list: forecastList,
                city: { timezone }
            } = forecast;

            hourlySection.innerHTML = `
                <h2 class="title_2">Today At</h2>
                <div class="slider_container">
                    <ul class="slider_list" data-temp>
                    </ul>
                    <ul class="slider_list" data-wind>
                    </ul>
                </div>
            `;

            for (const [index, data] of forecastList.entries()) {
                if (index > 7) break;

                const {
                    dt: dateTimeUnix,
                    main: { temp },
                    weather,
                    wind: { deg: windDirection, speed: windSpeed }
                } = data

                const [{ icon, description }] = weather

                const tempLi = document.createElement("li");
                tempLi.classList.add("slider_item");
                tempLi.innerHTML = `
                    <div class="card card_sm slider_card">
                        <p class="body_3">${module.getHours(dateTimeUnix, timezone)}</p>
                        <img src="/icons/${icon}.png" width="48" height="48" loading="lazy" alt="${description}"
                            class="weather_icon">
                        <p class="body_3">${parseInt(temp)}&deg;</p>
                    </div>
                `;

                hourlySection.querySelector("[data-temp]").appendChild(tempLi);

                const windLi = document.createElement("li");
                windLi.classList.add("slider_item");
                windLi.innerHTML = `
                    <div class="card card_sm slider_card">
                        <p class="body_3">${module.getHours(dateTimeUnix, timezone)}</p>
                        <img src="/icons/direction.png" width="48" height="48" loading="lazy" alt="direction"
                            class="weather_icon" style="transform: rotate(${windDirection - 180}deg);">
                        <p class="body_3">${parseInt(module.mps_to_kmh(windSpeed))} km/h</p>
                    </div>
                `;

                hourlySection.querySelector("[data-wind]").appendChild(windLi);
            }

            forecastSection.innerHTML = `
                <h2 class="title_2" id="forecast-label">5 Day Forecast</h2>
                <div class="card card_lg forecast_card">
                    <ul data-forecast-list>
                    </ul>
                </div>
            `;

            for (let i = 7, len = forecastList.length; i < len; i += 8) {
                const {
                    main: { temp_max },
                    weather,
                    dt_txt
                } = forecastList[i];

                const [{ icon, description }] = weather
                const date = new Date(dt_txt);

                const li = document.createElement("li");
                li.classList.add("card_item");

                li.innerHTML = `
                    <div class="icon_wrapper">
                        <img src="/icons/${icon}.png" width="36" height="36" alt="${description}" class="weather_icon">
                        <span class="span">
                            <p class="title_2">${parseInt(temp_max)}&deg;</p>
                        </span>
                    </div>
                    <p class="label_1">${date.getDate()} ${module.monthNames[date.getUTCMonth()]}</p>
                    <p class="label_2">${module.weekDayNames[date.getDay()]}</p>
                `;

                forecastSection.querySelector("[data-forecast-list]").appendChild(li);
            }

            loading.style.display = "none";
            container.style.overflowY = "overlay";
            container.classList.add("fade-in");
        });
    });
}

export const error404 = () => errorContent.style.display = "flex";