import { AIResponse, PredictionResult } from '../types';
import { MAP_MODE, MAP_MECH, MAP_DET } from '../constants';

// Configuration for your Python Backend
// Ensure your api.py is running on this URL
const API_URL = 'http://localhost:8000/predict'; 

// Helper to get random items from a dictionary (Fallback simulation)
const getRandom = (map: Record<string, string>, count: number): PredictionResult[] => {
  const keys = Object.keys(map);
  const results: PredictionResult[] = [];
  for (let i = 0; i < count; i++) {
    const key = keys[Math.floor(Math.random() * keys.length)];
    results.push({
      code: key,
      label: map[key],
      confidence: i === 0 ? 0.85 + (Math.random() * 0.1) : 0.10 / (i + 1)
    });
  }
  return results;
};

/**
 * Classifies a failure by sending data to the Python Backend.
 * If the backend is offline, falls back to a simulation for UI testing.
 */
export const classifyFailure = async (
  tag: string,
  impact: string,
  description: string
): Promise<AIResponse> => {
  
  // 1. Try to call the Real Python Backend
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tag,
        impact,
        description
      }),
    });

    if (response.ok) {
      const data = await response.json();
      // Assuming your Python API returns the structure { mode: [], mechanism: [], detection: [] }
      // If your API returns a different structure, you map it here.
      return data as AIResponse;
    }
  } catch (error) {
    console.warn("Backend Connection Failed. Running in Simulation Mode.", error);
    // Proceed to simulation code below...
  }

  // 2. Fallback Simulation (if Python is not running)
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simple keyword matching to simulate "intelligence" for the demo
      const descLower = description.toLowerCase();
      
      let modeResults = getRandom(MAP_MODE, 3);
      let mechResults = getRandom(MAP_MECH, 3);
      let detResults = getRandom(MAP_DET, 3);

      // Simulate Logic based on keywords
      if (descLower.includes('vazamento') || descLower.includes('leak')) {
        modeResults = [
            { code: 'ELP', label: MAP_MODE['ELP'], confidence: 0.92 },
            { code: 'ELU', label: MAP_MODE['ELU'], confidence: 0.05 },
            { code: 'LCP', label: MAP_MODE['LCP'], confidence: 0.03 },
        ];
        mechResults = [
             { code: '1.1', label: MAP_MECH['1.1'], confidence: 0.88 },
             { code: '2.10', label: MAP_MECH['2.10'], confidence: 0.08 },
             { code: '1.5', label: MAP_MECH['1.5'], confidence: 0.04 },
        ];
      } else if (descLower.includes('vibra') || descLower.includes('noise')) {
         modeResults = [
            { code: 'VIB', label: MAP_MODE['VIB'], confidence: 0.89 },
            { code: 'NOI', label: MAP_MODE['NOI'], confidence: 0.08 },
            { code: 'LOO', label: MAP_MODE['LOO'], confidence: 0.03 },
        ];
         mechResults = [
             { code: '1.2', label: MAP_MECH['1.2'], confidence: 0.91 },
             { code: '1.5', label: MAP_MECH['1.5'], confidence: 0.05 },
             { code: '2.4', label: MAP_MECH['2.4'], confidence: 0.04 },
        ];
      }

      resolve({
        mode: modeResults,
        detection: detResults,
        mechanism: mechResults
      });
    }, 1200); // Simulate network latency
  });
};