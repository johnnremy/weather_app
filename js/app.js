// Constants
const API_KEY = 'a8ab72b10ff0d2e9a27f1ebfc8d814db'; // Replace with OpenWeather API key
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchButton = document.getElementById('searchButton');
const retryButton = document.getElementById('retryLocation');
const weatherInfo = document.getElementById('weatherInfo');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');

// Weather Display Elements
const cityName = document.getElementById('cityName');
const temperature = document.getElementById('temperature');
const description = document.getElementById('description');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const weatherIcon = document.getElementById('weatherIcon');

/**
 * Shows loading spinner with custom message
 * @param {string} message - Loading message to display
 */
function showLoading(message = 'Fetching weather data...') {
    const loadingText = loadingSpinner.querySelector('p');
    if (loadingText) {
        loadingText.textContent = message;
    }
    loadingSpinner.classList.remove('hidden');
    weatherInfo.classList.add('hidden');
    errorMessage.classList.add('hidden');
}

/**
 * Hides loading spinner
 */
function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

/**
 * Fetches weather data from the OpenWeather API
 * @param {string} city - The name of the city
 * @returns {Promise} - The weather data
 */
async function fetchWeatherData(city) {
    const url = `${API_BASE_URL}?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('City not found');
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
}

/**
 * Fetches weather data using coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise} - The weather data
 */
async function fetchWeatherByCoords(lat, lon) {
    const url = `${API_BASE_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Unable to fetch weather for your location');
    }
    return await response.json();
}

/**
 * Updates the UI with weather data
 * @param {Object} data - The weather data from the API
 */
function updateWeatherDisplay(data, isLocationBased = false) {
    cityName.textContent = `${data.name}, ${data.sys.country}`;
    temperature.textContent = `${Math.round(data.main.temp)}°C`;
    description.textContent = data.weather[0].description
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    humidity.textContent = `${data.main.humidity}%`;
    windSpeed.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`; // Convert m/s to km/h

    // Update weather icon
    const iconCode = data.weather[0].icon;
    weatherIcon.innerHTML = `<img src="http://openweathermap.org/img/wn/${iconCode}@2x.png" alt="${data.weather[0].description}">`;

    // Show/hide retry button based on whether this is location-based weather
    retryButton.style.display = isLocationBased ? 'flex' : 'none';

    // Show the weather info
    weatherInfo.classList.remove('hidden');
}

/**
 * Shows error message
 * @param {string} message - The error message to display
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    weatherInfo.classList.add('hidden');
}

/**
 * Handles the weather search
 */
async function handleWeatherSearch() {
    const city = cityInput.value.trim();

    if (!city) {
        showError('Please enter a city name');
        return;
    }

    showLoading();
    retryButton.style.display = 'none'; // Hide retry button during search

    try {
        const data = await fetchWeatherData(city);
        updateWeatherDisplay(data);
    } catch (error) {
        showError(error.message === 'City not found'
            ? 'City not found. Please check the spelling and try again.'
            : 'An error occurred. Please try again later.');

        retryButton.style.display = 'flex'; // Show retry button after search failed
        retryButton.innerHTML = '<span class="retry-icon">📍</span> Get My Location';
    } finally {
        hideLoading();
    }
}

/**
 * Gets user's location and fetches weather
 */
async function getLocationAndWeather() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        // Show loading state for location detection
        showLoading('Detecting your location...');

        // Update retry button text while loading
        if (retryButton) {
            retryButton.innerHTML = '<span class="retry-icon">⏳</span> Detecting...';
            retryButton.style.display = 'flex'; // Show retry button for location-based weather
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    showLoading('Fetching weather for your location...');
                    const data = await fetchWeatherByCoords(
                        position.coords.latitude,
                        position.coords.longitude
                    );
                    updateWeatherDisplay(data);
                    resolve(data);
                } catch (error) {
                    reject(error);
                } finally {
                    hideLoading();
                    // Reset retry button text
                    if (retryButton) {
                        retryButton.innerHTML = '<span class="retry-icon">📍</span> Get My Location';
                    }
                }
            },
            (error) => {
                let errorMsg = 'Unable to detect your location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = 'Location access denied. Please enter a city name to check weather.';
                        break;
                    case error.TIMEOUT:
                        errorMsg = 'Location detection timed out. Please try again.';
                        break;
                }
                reject(new Error(errorMsg));
                hideLoading();
                // Reset retry button text
                if (retryButton) {
                    retryButton.innerHTML = '<span class="retry-icon">📍</span> Get My Location';
                    retryButton.style.display = 'flex'; // Keep showing retry button on error
                }
            },
            {
                timeout: 120000, // 120 second timeout
                maximumAge: 300000 // Cache location for 5 minutes
            }
        );
    });
}

// Event Listeners
searchButton.addEventListener('click', handleWeatherSearch);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleWeatherSearch();
    }
});

retryButton.addEventListener('click', async () => {
    // Disable the retry button during the process
    retryButton.disabled = true;
    retryButton.style.opacity = '0.7';

    try {
        await getLocationAndWeather();
    } catch (error) {
        showError(error.message);
    } finally {
        // Re-enable the retry button
        retryButton.disabled = false;
        retryButton.style.opacity = '1';
    }
});

// Initialize with user's location
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await getLocationAndWeather();
    } catch (error) {
        showError(error.message);
        console.error('Error getting location weather:', error);
    }
});
