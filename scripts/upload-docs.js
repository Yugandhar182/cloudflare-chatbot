const WORKER_URL = 'https://chatbot-ai-worker.yugandhar-chatbot-2024.workers.dev';

async function uploadDocuments() {
  const fs = await import('fs');
  const path = await import('path');
  
  const docsDir = '../docs/knowledge-base';
  const documents = [];

  try {
    const files = fs.readdirSync(docsDir);
    console.log('Found files:', files);
    
    for (const file of files) {
      if (file.endsWith('.txt')) {
        const filePath = path.join(docsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        console.log(`Reading ${file}: ${content.length} characters`);
        
        // Split into chunks
        const chunks = content.split('\n\n')
          .map(chunk => chunk.trim())
          .filter(chunk => chunk.length > 20);
        
        console.log(`Split ${file} into ${chunks.length} chunks`);
        
        chunks.forEach((chunk, index) => {
          documents.push({
            content: chunk,
            source: `${file} (chunk ${index + 1})`
          });
        });
      }
    }

    console.log(`\nTotal documents to upload: ${documents.length}`);
    console.log('First document sample:', documents[0]);

    // Try uploading just one document first to debug
    console.log('\n--- Testing with single document ---');
    const testDoc = [documents[0]];

    const response = await fetch(`${WORKER_URL}/embed`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ texts: testDoc })
    });

    const responseText = await response.text();
    console.log('\nResponse status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    console.log('Raw response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
      console.log('Parsed result:', result);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError.message);
      return;
    }
    
    if (result.success) {
      console.log(`✅ Test successful! Now uploading all documents...`);
      
      // If test worked, upload all documents
      const fullResponse = await fetch(`${WORKER_URL}/embed`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ texts: documents })
      });

      const fullResult = await fullResponse.json();
      
      if (fullResult.success) {
        console.log(`🎉 Successfully embedded ${fullResult.embedded} documents!`);
      } else {
        console.log('❌ Full upload failed:', fullResult);
      }
    } else {
      console.error(`❌ Test failed:`, result);
    }

  } catch (error) {
    console.error(`❌ Error:`, error.message);
    console.error('Stack:', error.stack);
  }
}

uploadDocuments();
