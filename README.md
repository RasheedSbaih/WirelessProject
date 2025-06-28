# AI-Powered Wireless Network Design Application

An interactive web application that performs calculations for wireless and mobile network design scenarios with AI-powered explanations.

## Features

- **Four Calculation Scenarios**:
  1. Wireless Communication System
  2. OFDM Systems
  3. Link Budget Calculation
  4. Cellular System Design

- **AI Integration**: Provides detailed explanations of calculations and results
- **Web Interface**: User-friendly form-based interface
- **REST API**: JSON-based API for programmatic access

## Project Requirements

This application fulfills the requirements for the Wireless and Mobile Networks (ENCS5323) project:

> Develop and deploy a web-based application integrated with an AI agent that collects user-defined parameters, performs computations for wireless and mobile network design scenarios, and provides detailed, user-friendly explanations of the results using a Large Language Model (LLM) API.

## Installation

1. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

2. (Optional) Configure AI explanations by setting environment variables:
   ```bash
   export OPENROUTER_API_KEY="your_api_key"
   export OPENROUTER_MODEL_ID="your_model_id"
   ```

## Usage

1. Start the Flask server:
   ```bash
   cd backend
   python app.py
   ```

2. Open your web browser and navigate to `http://localhost:5000`

3. Select a scenario from the dropdown menu

4. Fill in the required parameters

5. Click "Calculate" to see results and AI explanations

## Scenarios

### 1. Wireless Communication System
Computes the rate at the output of each block in a wireless communication chain:
- Sampler output rate
- Quantizer output rate  
- Source encoder output rate
- Channel encoder output rate
- Interleaver output rate
- Burst formatting output rate

### 2. OFDM Systems
Calculates data rates for OFDM system components:
- Resource element rate
- OFDM symbol rate
- Resource block rate
- Maximum transmission capacity
- Spectral efficiency

### 3. Link Budget Calculation
Computes power and signal strength in a flat environment:
- Free Space Path Loss (FSPL)
- Received power
- Noise power
- Signal-to-Noise Ratio (SNR)

### 4. Cellular System Design
Designs cellular network parameters:
- Total users and traffic
- Cell area coverage
- Link margin
- Required number of cells

## API Endpoints

- `POST /api/wireless-communication` - Wireless communication calculations
- `POST /api/ofdm-systems` - OFDM system calculations  
- `POST /api/link-budget` - Link budget calculations
- `POST /api/cellular-design` - Cellular design calculations

## Request Format

```json
{
  "scenario": "scenario_name",
  "parameters": {
    "parameter_name": value,
    ...
  }
}
```

## Response Format

```json
{
  "success": true,
  "calculations": {
    "result_name": value,
    ...
  },
  "explanation": "AI-generated explanation"
}
```

## Technologies Used

- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, JavaScript
- **AI Integration**: OpenRouter API
- **Dependencies**: See `requirements.txt`

## Project Structure

```
wireless_proj_fixed/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── requirements.txt    # Python dependencies
│   ├── templates/
│   │   └── index.html     # Web interface
│   └── static/
├── CHANGES.md             # Documentation of fixes made
└── README.md             # This file
```

## Deployment

For production deployment, consider:
- Using a production WSGI server (e.g., Gunicorn)
- Setting up environment variables for API keys
- Configuring proper CORS settings
- Using HTTPS for secure communication

## License

This project is developed for academic purposes as part of the ENCS5323 course.

