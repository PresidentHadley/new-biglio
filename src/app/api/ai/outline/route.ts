import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.BOOK_ANTHROPIC_API!,
});

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.BOOK_ANTHROPIC_API) {
      console.error('BOOK_ANTHROPIC_API environment variable is not set');
      return NextResponse.json(
        { error: 'AI service not configured', details: 'Missing API key configuration' },
        { status: 500 }
      );
    }
    
    const { 
      title, 
      description, 
      genre, 
      targetAudience, 
      chapterCount = 10,
      existingOutline 
    } = await request.json();
    
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }
    
    console.log('Generating outline for:', { title, description, genre, targetAudience, chapterCount });
    
    // Build outline generation prompt
    const systemPrompt = `You are an expert book outline creator specializing in audiobooks. Create detailed, engaging chapter outlines that work well for audio consumption.

Guidelines:
- Each chapter should be 2000-4000 words when written
- Focus on strong hooks and cliffhangers
- Consider pacing for audio listeners
- Include emotional beats and character development
- Ensure chapters flow naturally into each other
- Make each chapter title compelling and descriptive

Format your response as a JSON array with this structure:
[
  {
    "chapterNumber": 1,
    "title": "Chapter Title",
    "summary": "2-3 sentence summary of what happens",
    "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
    "estimatedWordCount": 3000
  }
]`;

    const userPrompt = `Create a ${chapterCount}-chapter outline for this audiobook:

Title: ${title}
Description: ${description}
${genre ? `Genre: ${genre}` : ''}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}

${existingOutline ? `Existing outline to improve upon:\n${JSON.stringify(existingOutline, null, 2)}` : ''}

Please create an engaging, well-structured outline that will captivate audio listeners.`;
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.8,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });
    
    const responseContent = response.content[0];
    const aiResponse = responseContent.type === 'text' ? responseContent.text : '';
    
    // Try to parse JSON response
    let outline;
    try {
      // Extract JSON from response if it's wrapped in markdown or other text
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
      outline = JSON.parse(jsonString);
    } catch {
      // If JSON parsing fails, return the raw response
      outline = {
        rawResponse: aiResponse,
        note: 'Could not parse as JSON - raw AI response provided'
      };
    }
    
    return NextResponse.json({
      success: true,
      outline,
      usage: response.usage,
      rawResponse: aiResponse
    });
    
  } catch (error) {
    console.error('AI outline error:', error);
    
    // More detailed error information
    let errorMessage = 'AI outline generation failed';
    let errorDetails = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || error.message;
    }
    
    // Check for common issues
    if (errorMessage.includes('API key')) {
      errorDetails = 'Invalid or missing Anthropic API key';
    } else if (errorMessage.includes('rate limit')) {
      errorDetails = 'Rate limit exceeded - please try again in a moment';
    } else if (errorMessage.includes('timeout')) {
      errorDetails = 'Request timed out - please try again';
    }
    
    console.error('Detailed error:', { errorMessage, errorDetails, originalError: error });
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}