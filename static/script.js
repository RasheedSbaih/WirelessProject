const scenarios = {
  wireless_comm: ["samplerRate", "quantizerBits", "sourceEncoderRate", "channelEncoderRate", "interleaverDepth", "burstLength"],
  ofdm: ["numSubcarriers", "symbolDuration", "bitsPerSymbol", "numResourceBlocks", "bandwidth"],
  link_budget: ["transmitPower_dBm", "transmitAntennaGain_dBi", "receiveAntennaGain_dBi", "frequency_GHz", "distance_km", "noiseFigure_dB", "bandwidth_Hz"],
  cellular_design: ["numUsers", "avgUserDataRate_Mbps", "cellRadius_km", "frequencyBand_GHz", "maxTxPower_dBm", "minRxSensitivity_dBm"]
};

document.getElementById("scenario").addEventListener("change", loadInputs);

function loadInputs() {
  const scenario = document.getElementById("scenario").value;
  const inputs = scenarios[scenario];
  const container = document.getElementById("inputs");
  container.innerHTML = "";

  inputs.forEach(id => {
    const label = document.createElement("label");
    label.innerText = `${id}: `;
    const input = document.createElement("input");
    input.id = id;
    input.type = "number";
    input.step = "any";
    container.appendChild(label);
    container.appendChild(input);
    container.appendChild(document.createElement("br"));
  });
}

async function calculate() {
  const scenario = document.getElementById("scenario").value;
  const parameters = {};
  scenarios[scenario].forEach(id => {
    parameters[id] = parseFloat(document.getElementById(id).value);
  });

  const res = await fetch("http://localhost:5000/calculate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ scenario, parameters })
  });

  const data = await res.json();

  if (res.ok) {
    document.getElementById("result").textContent = JSON.stringify(data.results, null, 2);
    document.getElementById("explanation").textContent = data.explanation;
  } else {
    document.getElementById("result").textContent = "Error: " + (data.error || "Unknown error");
    document.getElementById("explanation").textContent = "";
  }
}

window.onload = loadInputs;
