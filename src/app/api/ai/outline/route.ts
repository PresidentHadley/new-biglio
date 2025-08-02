import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.BOOK_ANTHROPIC_API!,
});

export async function POST(request: NextRequest) {
  try {
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
    } catch (parseError) {
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
    
    return NextResponse.json(
      { 
        error: 'AI outline generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}