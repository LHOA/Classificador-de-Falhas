import React, { useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { FailureRecord } from '../types';
import { MAP_IMPACTO, MAP_MODE, MAP_MECH, MAP_DET } from '../constants';

interface BatchProcessorProps {
  onBatchComplete: (records: FailureRecord[]) => void;
}

const BatchProcessor: React.FC<BatchProcessorProps> = ({ onBatchComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processFile = async () => {
    if (!file) return;
    setProcessing(true);
    
    // SIMULATION: In a real app, parse CSV using PapaParse and send to backend
    // Here we just generate dummy data after a delay
    setTimeout(() => {
      const dummyRecords: FailureRecord[] = Array.from({ length: 10 }).map((_, i) => ({
        id: `batch-${Date.now()}-${i}`,
        tag: `BATCH-EQ-${100 + i}`,
        description: "Imported via Batch Processing (Simulated)",
        
        impactCode: i % 2 === 0 ? 'S' : 'D',
        impact: i % 2 === 0 ? MAP_IMPACTO['S'] : MAP_IMPACTO['D'],
        // Batch often implies manual data or High confidence AI
        
        modeCode: 'ELP',
        mode: MAP_MODE['ELP'],
        confidenceMode: 0.88,
        
        mechanismCode: '1.1',
        mechanism: MAP_MECH['1.1'],
        confidenceMech: 0.92,

        detectionCode: '1',
        detection: MAP_DET['1'],
        confidenceDet: 0.75,

        confidence: 0.85, // Avg
        status: 'Batch',
        timestamp: new Date()
      }));
      
      onBatchComplete(dummyRecords);
      setProcessing(false);
      setFile(null);
    }, 2000);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-2">Batch Processing</h3>
        <p className="text-slate-500 mb-6">Upload a CSV file with columns: Tag, Description, Impact.</p>
        
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all
            ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50'}
            ${file ? 'border-emerald-500 bg-emerald-50' : ''}
          `}
        >
          <input
            type="file"
            accept=".csv,.txt"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
          />
          
          {file ? (
            <div className="text-center">
               <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <FileText className="w-8 h-8 text-emerald-600" />
               </div>
               <p className="font-semibold text-emerald-900">{file.name}</p>
               <p className="text-sm text-emerald-600 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <UploadCloud className="w-8 h-8 text-indigo-600" />
              </div>
              <p className="font-semibold text-slate-700">Drag & Drop your CSV here</p>
              <p className="text-sm text-slate-500 mt-2">or click to browse</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={processFile}
            disabled={!file || processing}
            className={`px-6 py-3 rounded-lg font-semibold text-white transition-all
              ${!file || processing 
                ? 'bg-slate-300 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-900/20'}`}
          >
            {processing ? 'Processing...' : 'Run Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchProcessor;