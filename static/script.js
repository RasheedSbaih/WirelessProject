// Global variables
let currentTab = 'wireless-comm';
const API_BASE_URL = window.location.origin;
let lastCalculationResults = {}; // Store results for export

// DOM elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const forms = document.querySelectorAll('.form');
const resultsSection = document.getElementById('results-section');
const resultsGrid = document.getElementById('results-grid');
const explanationContent = document.getElementById('explanation-content');
const loadingOverlay = document.getElementById('loading-overlay');
const clearResultsBtn = document.getElementById('clear-results');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    showTab('wireless-comm');
    restoreFormData();
    initializeTooltips();
});

// Event listeners
function initializeEventListeners() {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            showTab(tabId);
        });
    });

    forms.forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });

    clearResultsBtn.addEventListener('click', clearResults);
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Tab switching functionality
function showTab(tabId) {
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) btn.classList.add('active');
    });

    tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabId) content.classList.add('active');
    });

    currentTab = tabId;
    clearResults();
}

// Form submission handler
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Define required fields
    const requiredFields = {
        'wireless-comm': ['input_rate', 'sampling_rate', 'quantization_levels', 'source_coding_rate', 'channel_coding_rate'],
        'ofdm': ['subcarrier_spacing', 'symbol_duration', 'modulation_order', 'coding_rate', 'num_subcarriers'],
        'link-budget': ['transmit_power_dbm', 'frequency_mhz', 'distance_km'],
        'cellular': ['coverage_area_km2', 'user_density_per_km2', 'traffic_per_user_erlang']
    };
    
    const errors = validateForm(data, requiredFields[currentTab]);
    if (errors.length > 0) {
        showError(errors.join('\n'));
        button.disabled = false;
        return;
    }
    
    // Convert numeric fields and modulation order
    for (const key in data) {
        if (data[key] !== '' && !isNaN(data[key])) {
            data[key] = parseFloat(data[key]);
        }
        if (key === 'modulation_order') {
            const validOrders = [4, 16, 64, 256];
            if (!validOrders.includes(Number(data[key]))) {
                showError('Invalid modulation order. Must be 4, 16, 64, or 256.');
                button.disabled = false;
                return;
            }
            data[key] = Math.log2(data[key]);
        }
    }

    let endpoint;
    switch (currentTab) {
        case 'wireless-comm':
            endpoint = '/api/wireless-communication';
            break;
        case 'ofdm':
            endpoint = '/api/ofdm-systems';
            break;
        case 'link-budget':
            endpoint = '/api/link-budget';
            break;
        case 'cellular':
            endpoint = '/api/cellular-design';
            break;
        default:
            showError('Invalid tab selected');
            button.disabled = false;
            return;
    }

    try {
        showLoading(true);
        const response = await fetch(API_BASE_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Calculation failed');
        displayResults(result);
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'An error occurred during calculation');
    } finally {
        showLoading(false);
        button.disabled = false;
    }
}

// Display calculation results
function displayResults(result) {
    if (!result.success) {
        showError(result.error || 'Calculation failed');
        return;
    }

    lastCalculationResults = result.results;
    resultsGrid.innerHTML = '';
    explanationContent.textContent = '';

    const results = result.results;
    for (const [key, value] of Object.entries(results)) {
        if (typeof value === 'number') {
            const resultItem = createResultItem(key, value);
            resultsGrid.appendChild(resultItem);
        }
    }

    if (result.explanation) explanationContent.textContent = result.explanation;
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Create result item element
function createResultItem(key, value) {
    const item = document.createElement('div');
    item.className = 'result-item';
    
    const label = formatLabel(key);
    const formattedValue = formatValue(value);
    const unit = getUnit(key);
    
    item.innerHTML = `
        <div class="label">${label}</div>
        <div class="value">${formattedValue}</div>
        <div class="unit">${unit}</div>
    `;
    
    return item;
}

// Format label for display
function formatLabel(key) {
    return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/Db/g, 'dB')
        .replace(/Snr/g, 'SNR')
        .replace(/Eirp/g, 'EIRP')
        .replace(/Fspl/g, 'FSPL')
        .replace(/Ofdm/g, 'OFDM')
        .replace(/Rb/g, 'RB')
        .replace(/Re/g, 'RE')
        .replace(/Km2/g, 'km²');
}

// Format numerical values
function formatValue(value) {
    if (!isFinite(value)) return 'Invalid';
    if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(2) + 'G';
    if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(2) + 'M';
    if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(2) + 'k';
    if (Math.abs(value) < 1 && value !== 0) return value.toExponential(3);
    return value.toFixed(2);
}

// Get appropriate unit for each parameter
function getUnit(key) {
    const units = {
        'sampler_output_rate': 'samples/sec',
        'quantizer_output_rate': 'bits/sec',
        'source_encoder_output_rate': 'bits/sec',
        'channel_encoder_output_rate': 'bits/sec',
        'interleaver_output_rate': 'bits/sec',
        'burst_formatting_output_rate': 'bits/sec',
        'resource_element_rate': 'bits/RE',
        'ofdm_symbol_rate': 'bits/symbol',
        'ofdm_symbol_rate_hz': 'Hz',
        'resource_block_rate': 'bits/sec',
        'max_transmission_capacity': 'bits/sec',
        'spectral_efficiency': 'bits/sec/Hz',
        'fspl_db': 'dB',
        'received_power_dbm': 'dBm',
        'noise_power_dbm': 'dBm',
        'snr_db': 'dB',
        'total_users': 'users',
        'total_traffic_erlang': 'Mbps',
        'cell_area_km2': 'km²',
        'link_margin_db': 'dB',
        'required_cells': 'cells'
    };
    return units[key] || '';
}

// Show/hide loading overlay
function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    resultsSection.prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Clear results
function clearResults() {
    resultsSection.style.display = 'none';
    resultsGrid.innerHTML = '';
    explanationContent.textContent = '';
}

// Keyboard shortcuts
function handleKeyboardShortcuts(event) {
    if ((event.ctrlKey || event.metaKey) && event.key >= '1' && event.key <= '4') {
        event.preventDefault();
        const tabIndex = parseInt(event.key) - 1;
        const tabs = ['wireless-comm', 'ofdm', 'link-budget', 'cellular'];
        if (tabs[tabIndex]) showTab(tabs[tabIndex]);
    }
    
    if (event.key === 'Escape') clearResults();
    
    if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') {
        const activeForm = document.querySelector(`#${currentTab} form`);
        if (activeForm && document.activeElement.closest('form') === activeForm) {
            event.preventDefault();
            activeForm.dispatchEvent(new Event('submit'));
        }
    }
}

// Form validation helpers
function validateForm(formData, requiredFields) {
    const errors = [];
    for (const field of requiredFields) {
        if (!formData[field] || formData[field] === '') {
            errors.push(`${formatLabel(field)} is required`);
        }
    }
    return errors;
}

// Auto-save form data to localStorage
function saveFormData(tabId, data) {
    localStorage.setItem(`wireless-app-${tabId}`, JSON.stringify(data));
}

// Load form data from localStorage
function loadFormData(tabId) {
    const saved = localStorage.getItem(`wireless-app-${tabId}`);
    return saved ? JSON.parse(saved) : null;
}

// Restore form data on page load
function restoreFormData() {
    forms.forEach(form => {
        const tabId = form.closest('.tab-content').id;
        const savedData = loadFormData(tabId);
        if (savedData) {
            for (const [key, value] of Object.entries(savedData)) {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) input.value = value;
            }
        }
    });
}

// Export results functionality
function exportResults(format = 'json') {
    const results = {
        timestamp: new Date().toISOString(),
        tab: currentTab,
        explanation: explanationContent.textContent || '',
        results: lastCalculationResults
    };
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `wireless-calculation-${currentTab}-${Date.now()}.json`;
    link.click();
}

// Add smooth scrolling for better UX
function smoothScrollTo(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Initialize tooltips for form fields
function initializeTooltips() {
    const tooltips = {
        'input_rate': 'The rate of the input signal in Hz',
        'sampling_rate': 'The frequency at which the analog signal is sampled',
        'quantization_levels': 'Number of discrete levels for quantization (e.g., 256 for 8-bit)',
        'source_coding_rate': 'Compression ratio (0-1, where 1 means no compression)',
        'channel_coding_rate': 'Error correction coding rate (0-1)',
        'modulation_order': 'Number of symbols in the modulation scheme',
        'subcarrier_spacing': 'Frequency spacing between OFDM subcarriers',
        'transmit_power_dbm': 'Transmitter output power in dBm',
        'frequency_mhz': 'Operating frequency in MHz',
        'distance_km': 'Distance between transmitter and receiver',
        'coverage_area_km2': 'Total area to be covered by the cellular system',
        'user_density_per_km2': 'Number of users per square kilometer',
        'traffic_per_user_erlang': 'Average traffic generated by each user in Erlang',
        'frequency_mhz_cellular': 'Operating frequency in MHz'
    };
    Object.entries(tooltips).forEach(([fieldName, tooltip]) => {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (field) field.title = tooltip;
    });
}

// Add visual feedback for form interactions
document.addEventListener('focus', function(event) {
    if (event.target.matches('input, select')) {
        event.target.parentElement.classList.add('focused');
    }
}, true);

document.addEventListener('blur', function(event) {
    if (event.target.matches('input, select')) {
        event.target.parentElement.classList.remove('focused');
    }
}, true);

// Add CSS class for focused form groups
const style = document.createElement('style');
style.textContent = `
    .form-group.focused {
        transform: scale(1.02);
        transition: transform 0.2s ease;
    }
    .error-message {
        background: #e53e3e;
        color: white;
        padding: 10px;
        border-radius: 8px;
        margin-bottom: 15px;
        text-align: center;
    }
`;
document.head.appendChild(style);