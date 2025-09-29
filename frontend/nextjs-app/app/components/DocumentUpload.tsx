'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';

interface DocumentUploadProps {
  onUploadComplete: () => void;
}

export default function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Check file type
    const allowedTypes = ['.txt', '.md', '.csv'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      setUploadError('Please upload only .txt, .md, or .csv files');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadStatus('Processing file...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus(`Successfully uploaded ${result.embedded} chunks from ${file.name}`);
        onUploadComplete();
        // Clear the input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setUploadError(result.error || 'Upload failed');
      }
    } catch (error) {
      setUploadError('Upload failed. Please try again.');
    }

    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="text-center"
      >
        <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
          <Upload className="w-full h-full" />
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Upload Documents
        </h3>
        
        <p className="text-gray-600 mb-4">
          Drag and drop files here, or click to select
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Select File'}
        </button>
        
        <p className="text-sm text-gray-500 mt-2">
          Supported formats: .txt, .md, .csv (Max 5MB)
        </p>
      </div>

      {uploadStatus && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <p className="text-sm text-green-700">{uploadStatus}</p>
        </div>
      )}

      {uploadError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-700">{uploadError}</p>
        </div>
      )}
    </div>
  );
}
