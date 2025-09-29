import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Please upload files under 5MB.' }, { status: 400 });
    }

    const text = await file.text();
    
    // Split text into chunks (simple approach)
    const chunks = text.split('\n\n')
      .map(chunk => chunk.trim())
      .filter(chunk => chunk.length > 20);
    
    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No valid content found in file' }, { status: 400 });
    }
    
    // Prepare texts for embedding
    const texts = chunks.map((chunk, index) => ({
      content: chunk,
      source: `${file.name} (chunk ${index + 1})`
    }));

    console.log(`Processing ${texts.length} chunks from ${file.name}`);

    // Send to worker for embedding
    const response = await fetch('https://chatbot-ai-worker.yugandhar-chatbot-2024.workers.dev/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        texts, 
        filename: file.name 
      }),
    });

    if (!response.ok) {
      throw new Error(`Worker response: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log(`Successfully processed ${data.embedded} chunks`);
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json(
      { error: 'Upload processing failed: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
