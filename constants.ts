export const MAP_IMPACTO: Record<string, string> = {
  "D": "D - Falha Crítica (Dead)",
  "S": "S - Falha Degradada (Degraded)",
  "U": "U - Falha Incipiente (Unwell)",
  "X": "Outros (X / None)"
};

export const MAP_MODE: Record<string, string> = {
  'OTH': 'Other (Outros)', 'ELP': 'External leakage - process medium', 'BRD': 'Breakdown', 
  'ELU': 'External leakage - utility medium', 'FTI': 'Failure to function as intended', 
  'FTO': 'Failure to open on demand', 'LCP': 'Leakage in close position', 'DOP': 'Delayed operation', 
  'LOO': 'Low output', 'PDE': 'Parameter deviation', 'FTF': 'Failure to function on demand', 
  'STD': 'Structural Deficiency', 'DEX': 'Defective EX Protection', 'FTS': 'Failure to start on demand', 
  'FTC': 'Failure to close on demand', 'LOP': 'Loss Of Power', 'STP': 'Failure to stop on demand', 
  'SLP': 'Slippage', 'PLU': 'Plugged / Choked', 'OHE': 'Overheating', 'IHT': 'Insufficient heat transfer', 
  'CTD': 'Contact danger / Electric shock', 'LOA': 'Load drop', 'EXP': 'Overpressure/Explosion', 
  'VIB': 'Vibration', 'INL': 'Internal leakage', 
  'LOR': 'Loss of redundancy', 'AOL': 'Abnormal output - low', 'HIO': 'High output', 
  'FOV': 'Faulty output voltage', 'NAC': 'Not acceptable alarm condition', 'ELF': 'External leakage - fuel', 
  'OSR': 'Overload/slow response/system warning', 'STC': 'Struct. deficiency containment risk', 
  'UST': 'Spurious stop', 'AIR': 'Abnormal instrument reading', 'SER': 'Minor in-service problems', 
  'FCO': 'Failure to connect', 'ERO': 'Erratic output', 'NOI': 'Noise', 'SPO': 'Spurious operation', 
  'UNK': 'Unknown', 'SHH': 'Spurious high alarm level', 'NOO': 'No output', 'FRO': 'Failure to rotate', 
  'PTF': 'Power / signal transmission failure', 'POW': 'Insufficient power', 
  'FTL': 'Failure to lock/unlock', 'FDC': 'Failure to disconnect', 
  'SBU': 'Sludge build-up', 'NON': 'No immediate effect', 
  'SLL': 'Spurious low alarm level', 
  'SCF': 'Secondary containment failure', 
  'WCL': 'Well-to-control-line communication', 'CSF': 'Control / signal failure', 
  'LRM': 'Loss of remote management', 'ISB': 'Information security breach', 'ILP': 'Internal leakage - process medium', 
  'EFA': 'Electronic failure'
};

export const MAP_MECH: Record<string, string> = {
  '1.0': 'General (Geral)', '1.1': 'Leakage (Vazamento)', '1.2': 'Vibration (Vibração)', 
  '1.3': 'Clearance/alignment failure', '1.4': 'Deformation', '1.5': 'Looseness', 
  '1.6': 'Sticking', '1.7': 'Insulation damage', '1.8': 'Degraded/insufficient support', 
  '1.9': 'Coating damage', '1.10': 'Damage to outer sheath', '1.11': 'Liquid filled annulus', 
  '1.12': 'Carcass collapse', '1.13': 'Pullout of liner', '1.14': 'Defective flameproof joint, mechanical', 
  '1.15': 'Defective enclosure/ IP', '2.0': 'General (Geral)', '2.1': 'Cavitation', 
  '2.2': 'Corrosion internal', '2.3': 'Erosion', '2.4': 'Wear', '2.5': 'Breakage', 
  '2.6': 'Fatigue', '2.7': 'Overheating', '2.8': 'Burst', '2.9': 'Corrosion external', 
  '2.10': 'Crack', '2.11': 'Damage to flange', '2.12': 'Degraded bolting', 
  '2.13': 'Insufficient cathodic protection', '2.14': 'Chloride penetration', 
  '2.15': 'Damaged concrete', '2.16': 'Defective flameproof joint, corrosion', 
  '2.17': 'Natural Degradation', '2.20': 'Corrosion under insulation (CUI)', 
  '2.21': 'Corrosion insulated bolts', '3.0': 'General (Geral)', '3.1': 'Control failure', 
  '3.2': 'No signal/indication/alarm', '3.3': 'Faulty signal/indication/alarm', 
  '3.4': 'Out of adjustment', '3.5': 'Software failure', '3.6': 'Common cause/mode failure', 
  '4.0': 'General (Geral)', '4.1': 'Short circuiting', '4.2': 'Open circuit', 
  '4.3': 'No power/voltage', '4.4': 'Faulty power/voltage', '4.5': 'Earth/isolation fault', 
  '4.6': 'Defective electrical connection', '5.0': 'General (Geral)', '5.1': 'Blockage/plugged', 
  '5.2': 'Contamination', '5.3': 'Miscellaneous external influences', '5.4': 'Marine fouling', 
  '5.5': 'Seabed erosion', '5.6': 'Free span', '5.7': 'Detrimental contact', 
  '5.8': 'Incorrect configuration', '5.9': 'Operation outside pressure and temp', 
  '6.0': 'General (Geral)', '6.1': 'No cause found', '6.2': 'Combined causes', 
  '6.3': 'Other', '6.4': 'Unknown', '6.5': 'Deviation from design'
};

export const MAP_DET: Record<string, string> = {
  '1': 'Periodic maintenance', '2': 'Functional testing', '3': 'Inspection', 
  '4': 'Periodic condition monitoring', '5': 'Continuous condition monitoring', 
  '6': 'Production interference', '7': 'Casual observation', '8': 'Corrective maintenance', 
  '9': 'On demand', '10': 'Other'
};