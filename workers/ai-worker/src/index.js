import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('/*', cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'DELETE'],
  allowHeaders: ['Content-Type'],
}));

app.get('/', (c) => {
  return c.json({ 
    message: 'Chatbot AI Worker is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/test-vectorize', async (c) => {
  try {
    const dummyVector = Array(768).fill(0).map(() => Math.random() * 0.1);
    const result = await c.env.VECTORIZE.query(dummyVector, { topK: 1 });
    
    return c.json({ 
      success: true, 
      message: 'Vectorize connection successful',
      resultCount: result.matches.length,
      indexDimensions: 768
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error.message
    });
  }
});

app.get('/test-ai', async (c) => {
  try {
    const response = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: 'Say hello!' }],
      max_tokens: 50
    });
    
    return c.json({ 
      success: true, 
      message: 'AI connection successful',
      response: response.response || response.result
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error.message
    });
  }
});

// List all documents in vectorize
app.get('/documents', async (c) => {
  try {
    // Query vectorize to get all documents
    const dummyVector = Array(768).fill(0);
    const result = await c.env.VECTORIZE.query(dummyVector, { 
      topK: 100,
      returnMetadata: true 
    });

    const documents = result.matches.map(match => ({
      id: match.id,
      source: match.metadata.source,
      text: match.metadata.text.substring(0, 200) + '...',
      timestamp: match.metadata.timestamp,
      length: match.metadata.length
    }));

    return c.json({ 
      success: true, 
      documents,
      total: documents.length 
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete a document by ID
app.delete('/documents/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.VECTORIZE.deleteByIds([id]);
    
    return c.json({ 
      success: true, 
      message: `Document ${id} deleted successfully` 
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Enhanced embed endpoint that processes various file formats
app.post('/embed', async (c) => {
  try {
    const { texts, filename } = await c.req.json();
    
    if (!texts || !Array.isArray(texts)) {
      return c.json({ error: 'Invalid input. Expected array of texts.' }, 400);
    }

    console.log(`Processing ${texts.length} documents from ${filename || 'unknown file'}...`);
    const vectors = [];
    
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const content = typeof text === 'string' ? text : text.content;
      
      if (!content || content.trim().length < 10) {
        console.log(`Skipping document ${i}: too short`);
        continue;
      }
      
      try {
        console.log(`Generating embedding for document ${i}...`);
        
        const embeddingResult = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: content
        });
        
        let embeddingVector;
        if (embeddingResult.data && Array.isArray(embeddingResult.data) && embeddingResult.data.length > 0) {
          embeddingVector = embeddingResult.data[0];
        } else {
          console.log(`No valid embedding data for document ${i}`);
          continue;
        }

        if (embeddingVector.length !== 768) {
          console.error(`Wrong embedding dimensions for document ${i}: expected 768, got ${embeddingVector.length}`);
          continue;
        }
        
        const vector = {
          id: `doc-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6)}`,
          values: embeddingVector,
          metadata: {
            text: content,
            source: filename || (typeof text === 'object' ? text.source : 'unknown'),
            timestamp: new Date().toISOString(),
            length: content.length,
            uploadedViaUI: true
          }
        };
        
        vectors.push(vector);
        
      } catch (embeddingError) {
        console.error(`Error embedding document ${i}:`, embeddingError.message);
        continue;
      }
    }

    if (vectors.length === 0) {
      return c.json({ 
        error: 'No valid embeddings were generated',
        processed: 0,
        total: texts.length
      }, 400);
    }

    console.log(`Storing ${vectors.length} vectors in Vectorize...`);
    await c.env.VECTORIZE.upsert(vectors);
    
    return c.json({ 
      success: true, 
      embedded: vectors.length,
      total: texts.length,
      message: `Successfully embedded ${vectors.length} out of ${texts.length} documents from ${filename || 'uploaded file'}`
    });

  } catch (error) {
    console.error('Embedding error:', error);
    return c.json({ 
      error: 'Failed to embed documents', 
      details: error.message 
    }, 500);
  }
});

app.post('/chat', async (c) => {
  try {
    const { message, context = [] } = await c.req.json();
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return c.json({ error: 'Message is required and must be non-empty' }, 400);
    }

    console.log('Processing chat message:', message.substring(0, 100) + '...');

    const embeddingResult = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: message
    });

    let embeddingVector;
    if (embeddingResult.data && Array.isArray(embeddingResult.data) && embeddingResult.data.length > 0) {
      embeddingVector = embeddingResult.data[0];
    } else {
      throw new Error('Failed to generate embedding for user message');
    }

    const searchResults = await c.env.VECTORIZE.query(embeddingVector, {
      topK: 5,
      returnValues: false,
      returnMetadata: true
    });

    console.log(`Found ${searchResults.matches.length} potential matches`);

    const relevantMatches = searchResults.matches.filter(match => match.score > 0.3);
    const relevantContext = relevantMatches
      .map(match => match.metadata.text)
      .join('\n\n');

    console.log(`Using ${relevantMatches.length} relevant matches for context`);

    const systemPrompt = relevantContext 
      ? `You are a helpful AI assistant. Use the following context to answer questions:

Context:
${relevantContext}

Answer based on the context when relevant, but also provide helpful general responses.`
      : `You are a helpful AI assistant. Provide a helpful response based on your general knowledge.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...context.slice(-4),
      { role: "user", content: message }
    ];

    const response = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages,
      max_tokens: 512,
      temperature: 0.7
    });

    const aiResponse = response.response || response.result || 'Sorry, I could not generate a response.';

    return c.json({
      response: aiResponse,
      sources: relevantMatches.map(match => ({
        text: match.metadata.text.substring(0, 150) + '...',
        score: Math.round(match.score * 100) / 100,
        source: match.metadata.source || 'Unknown'
      })).slice(0, 3),
      contextUsed: relevantMatches.length > 0
    });

  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ 
      error: 'Failed to process chat message',
      details: error.message 
    }, 500);
  }
});

export default app;
