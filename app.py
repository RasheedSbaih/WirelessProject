import os
import math
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import openai

load_dotenv()

app = Flask(__name__, static_url_path='/static', static_folder='static', template_folder='templates')
CORS(app)

#OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_API_KEY="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"

OPENROUTER_MODEL_ID="mistralai/mistral-7b-instruct"
#OPENROUTER_MODEL_ID = os.getenv("OPENROUTER_MODEL_ID")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

openrouter_client = None
if OPENROUTER_API_KEY and OPENROUTER_MODEL_ID:
    try:
        openrouter_client = openai.OpenAI(
            base_url=OPENROUTER_BASE_URL,
            api_key=OPENROUTER_API_KEY,
        )
    except Exception as e:
        print(f"Error configuring OpenRouter API: {e}")

@app.route("/")
def home():
    return render_template("index.html")

# Map new frontend field names to backend parameters
param_mapping = {
    'wireless-comm': {
        'input_rate': 'samplerRate',
        'sampling_rate': 'samplerRate',
        'quantization_levels': 'quantizerBits',
        'source_coding_rate': 'sourceEncoderRate',
        'channel_coding_rate': 'channelEncoderRate',
        'interleaver_depth': 'interleaverDepth',
        'burst_format_overhead': 'burstLength'
    },
    'ofdm': {
        'subcarrier_spacing': 'numSubcarriers',  # Note: Adjust calculations if needed
        'symbol_duration': 'symbolDuration',
        'modulation_order': 'bitsPerSymbol',
        'num_resource_blocks': 'numResourceBlocks',
        'bandwidth': 'bandwidth',
        'coding_rate': 'codingRate',  # Not used in backend, ignore
        'cyclic_prefix_duration': 'cyclicPrefixDuration',  # Not used, ignore
        'subcarriers_per_rb': 'subcarriersPerRb',  # Not used, ignore
        'symbols_per_slot': 'symbolsPerSlot'  # Not used, ignore
    },
    'link-budget': {
        'transmit_power_dbm': 'transmitPower_dBm',
        'transmit_antenna_gain_dbi': 'transmitAntennaGain_dBi',
        'receive_antenna_gain_dbi': 'receiveAntennaGain_dBi',
        'frequency_mhz': 'frequency_GHz',  # Convert MHz to GHz
        'distance_km': 'distance_km',
        'noise_figure_db': 'noiseFigure_dB',
        'bandwidth_hz': 'bandwidth_Hz',
        'transmit_cable_loss_db': 'transmitCableLoss_dB',  # Not used, ignore
        'receive_cable_loss_db': 'receiveCableLoss_dB',  # Not used, ignore
        'required_snr_db': 'requiredSNR_dB'  # Not used, ignore
    },
    'cellular': {
        'coverage_area_km2': 'cellRadius_km',  # Convert area to radius
        'user_density_per_km2': 'numUsers',  # Derive numUsers
        'traffic_per_user_erlang': 'avgUserDataRate_Mbps',  # Approximate mapping
        'frequency_mhz_cellular': 'frequencyBand_GHz',  # Convert MHz to GHz
        'base_station_power_w': 'maxTxPower_dBm',  # Convert W to dBm
        'blocking_probability': 'blockingProbability',  # Not used, ignore
        'frequency_reuse_factor': 'frequencyReuseFactor',  # Not used, ignore
        'total_spectrum_mhz': 'totalSpectrum_MHz',  # Not used, ignore
        'channel_bandwidth_khz': 'channelBandwidth_kHz',  # Not used, ignore
        'antenna_height_m': 'antennaHeight_m'  # Not used, ignore
    }
}

def map_parameters(scenario, data):
    """Map frontend parameters to backend parameters."""
    # The frontend sends parameters directly with the expected backend names
    # No mapping needed, just return the data as-is
    return data

@app.route('/api/wireless-communication', methods=['POST'])
def wireless_communication():
   # print(param_mapping)
    return handle_calculation('wireless-comm')


@app.route('/api/ofdm-systems', methods=['POST'])
def ofdm_systems():
    return handle_calculation('ofdm')

@app.route('/api/link-budget', methods=['POST'])
def link_budget():
    return handle_calculation('link_budget')

@app.route('/api/cellular-design', methods=['POST'])
def cellular_design():
    return handle_calculation('cellular_design')

def handle_calculation(scenario):
    data = request.get_json()
    
    # Extract parameters from the request structure
    if 'parameters' in data:
        parameters = data['parameters']
    else:
        parameters = data
    
    # Map parameters if needed
    parameters = map_parameters(scenario, parameters)
    print(f"Scenario: {scenario}")
    print(f"Parameters: {parameters}")
    
    valid, msg = validate_inputs(scenario, parameters)
    if not valid:
        return jsonify({"success": False, "error": msg}), 400

    try:
        results = perform_calculations(scenario, parameters)
        explanation = "AI explanation unavailable."

        if openrouter_client:
            prompt = f"""
            Analyze this wireless/mobile network scenario and its results.
            Explain how each value was calculated and what it means.

            Scenario: {scenario}
            Input: {parameters}
            Results: {results}
            """
            try:
                response = openrouter_client.chat.completions.create(
                    model=OPENROUTER_MODEL_ID,
                    messages=[
                        {"role": "system", "content": "You're a network design tutor."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=1500
                )
                explanation = response.choices[0].message.content
            except Exception as e:
                app.logger.error(f"LLM Error: {e}")
                explanation = "Error generating explanation from AI."

        return jsonify({"success": True, "calculations": results, "explanation": explanation})

    except Exception as e:
        app.logger.error(f"Server Error: {e}")
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500

def validate_inputs(scenario, parameters):
    if not isinstance(parameters, dict):
        return False, "Parameters must be a dictionary."

    checks = {
        'wireless-comm': ['samplerRate', 'quantizerBits', 'sourceEncoderRate', 'channelEncoderRate', 'interleaverDepth', 'burstLength'],
        'ofdm': ['numSubcarriers', 'symbolDuration', 'bitsPerSymbol', 'numResourceBlocks', 'bandwidth'],
        'link_budget': ['transmitPower_dBm', 'transmitAntennaGain_dBi', 'receiveAntennaGain_dBi', 'frequency_GHz', 'distance_km', 'noiseFigure_dB', 'bandwidth_Hz'],
        'cellular_design': ['numUsers', 'avgUserDataRate_Mbps', 'cellRadius_km', 'frequencyBand_GHz', 'maxTxPower_dBm', 'minRxSensitivity_dBm']
    }

    if scenario not in checks:
        return False, "Unknown scenario."

    for param in checks[scenario]:
        val = parameters.get(param)
       
        if val is None:
            return False, f"Missing required parameter '{param}'"
        if not isinstance(val, (int, float)):
            return False, f"Invalid value for '{param}'"
        if val <= 0 and param != 'minRxSensitivity_dBm':
            return False, f"'{param}' must be > 0"

    if scenario == 'ofdm' and parameters.get('bitsPerSymbol') not in [2, 4, 6, 8]:
        return False, "'bitsPerSymbol' must be 2, 4, 6, or 8."

    if scenario == 'wireless-comm':
        if not (0 < parameters.get('sourceEncoderRate') <= 1):
            return False, "'sourceEncoderRate' must be between 0 and 1."
        if not (0 < parameters.get('channelEncoderRate') <= 1):
            return False, "'channelEncoderRate' must be between 0 and 1."

    return True, ""

def perform_calculations(scenario, p):
    r = {}

    if scenario == 'wireless-comm':
        r['sampler_output_rate'] = p['samplerRate'] * p['quantizerBits']
        r['quantizer_output_rate'] = r['sampler_output_rate']
        r['source_encoder_output_rate'] = r['quantizer_output_rate'] * p['sourceEncoderRate']
        r['channel_encoder_output_rate'] = r['source_encoder_output_rate'] / p['channelEncoderRate']
        r['interleaver_output_rate'] = r['channel_encoder_output_rate']
        r['burst_formatting_output_rate'] = r['interleaver_output_rate'] * (1 + p['burstLength'] / 100)

    elif scenario == 'ofdm':
        bits_per_symbol = p['bitsPerSymbol']
        r['resource_element_rate'] = bits_per_symbol
        r['ofdm_symbol_rate'] = bits_per_symbol * p['numSubcarriers']
        symbol_rate = 1 / p['symbolDuration']
        r['ofdm_symbol_rate_hz'] = symbol_rate
        r['resource_block_rate'] = 12 * 7 * bits_per_symbol / (7 * p['symbolDuration'])
        r['max_transmission_capacity'] = r['resource_block_rate'] * p['numResourceBlocks']
        r['spectral_efficiency'] = r['max_transmission_capacity'] / p['bandwidth']

    elif scenario == 'link_budget':
        c = 3e8
        f = p['frequency_GHz'] * 1e9
        d = p['distance_km'] * 1000
        FSPL = 20 * math.log10(d) + 20 * math.log10(f) + 20 * math.log10(4 * math.pi / c)
        r['fspl_db'] = FSPL
        r['received_power_dbm'] = (p['transmitPower_dBm'] + p['transmitAntennaGain_dBi'] +
                                   p['receiveAntennaGain_dBi'] - FSPL)
        N = 1.38e-23 * 290 * p['bandwidth_Hz']
        r['noise_power_dbm'] = 10 * math.log10(N * 1000)
        r['snr_db'] = r['received_power_dbm'] - (r['noise_power_dbm'] + p['noiseFigure_dB'])

    elif scenario == 'cellular_design':
        r['total_users'] = p['numUsers']
        r['total_traffic_erlang'] = p['numUsers'] * p['avgUserDataRate_Mbps']
        r['cell_area_km2'] = math.pi * p['cellRadius_km']**2
        path_loss = p['maxTxPower_dBm'] + 18 - p['minRxSensitivity_dBm'] - 5
        r['link_margin_db'] = path_loss
        avg_capacity = 100
        r['required_cells'] = math.ceil(r['total_traffic_erlang'] / avg_capacity)

    return r

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)