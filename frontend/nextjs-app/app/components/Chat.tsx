'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, Upload, Database } from 'lucide-react';
import DocumentUpload from './DocumentUpload';
import DocumentsViewer from './DocumentsViewer';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  sources?: Array<{
    text: string;
    score: number;
    source: string;
  }>;
}

type ViewMode = 'chat' | 'upload' | 'documents';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          context: messages.slice(-5).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
        sources: data.sources
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleUploadComplete = () => {
    setViewMode('chat');
    const successMessage: Message = {
      id: Date.now().toString(),
      content: 'Documents uploaded successfully! You can now ask questions about the new content.',
      role: 'assistant',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, successMessage]);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-md border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TechCorp AI Assistant</h1>
                <p className="text-sm text-gray-600">Powered by Cloudflare AI & Vectorize</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('chat')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'chat' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>Chat</span>
              </button>
              
              <button
                onClick={() => setViewMode('upload')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
              
              <button
                onClick={() => setViewMode('documents')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'documents' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Documents</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full">
          {viewMode === 'upload' && (
            <div className="p-6">
              <DocumentUpload onUploadComplete={handleUploadComplete} />
            </div>
          )}

          {viewMode === 'documents' && (
            <div className="p-6 h-full overflow-y-auto">
              <DocumentsViewer />
            </div>
          )}

          {viewMode === 'chat' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bot className="w-10 h-10 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-2">Welcome to TechCorp AI</h2>
                    <p className="text-gray-600 mb-8">I can help you learn about our services, technologies, and capabilities. You can also upload your own documents!</p>
                    
                    <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                      <button 
                        onClick={() => setInput("What services does TechCorp offer?")}
                        className="p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left"
                      >
                        <div className="text-blue-600 font-medium mb-1">Our Services</div>
                        <div className="text-sm text-gray-600">Learn about what we offer</div>
                      </button>
                      <button 
                        onClick={() => setInput("What programming languages do you work with?")}
                        className="p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left"
                      >
                        <div className="text-blue-600 font-medium mb-1">Technologies</div>
                        <div className="text-sm text-gray-600">Our tech stack & expertise</div>
                      </button>
                      <button 
                        onClick={() => setViewMode('upload')}
                        className="p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left"
                      >
                        <div className="text-blue-600 font-medium mb-1">Upload Docs</div>
                        <div className="text-sm text-gray-600">Add your own content</div>
                      </button>
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-3xl ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' ? 'bg-blue-600' : 'bg-gray-600'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <Bot className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                        message.role === 'user' 
                          ? 'bg-blue-600 text-white ml-3' 
                          : 'bg-white text-gray-800 mr-3 border'
                      }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <div className="flex items-center space-x-1 mb-2">
                              <FileText className="w-3 h-3 text-gray-500" />
                              <span className="text-xs font-medium text-gray-600">Sources used:</span>
                            </div>
                            <div className="space-y-2">
                              {message.sources.map((source, index) => (
                                <div key={index} className="bg-gray-50 rounded-lg p-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-blue-600">{source.source}</span>
                                    <span className="text-xs text-gray-500">
                                      {(source.score * 100).toFixed(0)}% match
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-700 italic">{source.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area - Only show in chat mode */}
              <div className="bg-white border-t shadow-lg">
                <div className="max-w-4xl mx-auto p-4">
                  <div className="flex space-x-3">
                    <div className="flex-1 relative">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me anything about your documents..."
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={1}
                        disabled={loading}
                      />
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={loading || !input.trim()}
                      className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
