import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { detectBookType, getOutlineGuidance } from '@/utils/bookTypeDetection';

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
      existingOutline,
      bookType: inputBookType 
    } = await request.json();
    
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }
    
    // Detect book type and build specialized prompt (from old system)
    const bookType = inputBookType || detectBookType(genre);
    const outlineGuidance = getOutlineGuidance(bookType);
    
    console.log('Generating outline for:', { title, description, genre, targetAudience, chapterCount, bookType });
    
    // Build specialized outline generation prompt based on proven old system
    let outlinePrompt: string;
    
    if (bookType === 'non-fiction') {
      outlinePrompt = `You are an expert book editor tasked with creating a chapter-by-chapter outline for a NON-FICTION book. Do NOT write a story or use fictional characters. Instead, generate a practical, instructional, or informational outline with chapters and key points appropriate for a non-fiction book in the "${genre}" genre.

Book Details:
- Title: ${title}
- Genre: ${genre}
- Type: Non-Fiction
- Description: ${description}
- Target Audience: ${Array.isArray(targetAudience) ? targetAudience.join(', ') : targetAudience || 'General audience'}
- Number of Chapters: ${chapterCount}

Requirements:
1. Produce EXACTLY ${chapterCount} chapters. Do not deviate from this number under any circumstances.
2. Each chapter must have a clear, descriptive title (max 50 characters) and a summary (100-150 words) that teaches, explains, or guides the reader on a specific topic.
3. The outline should be logical, progressive, and cover the subject matter thoroughly.
4. Avoid stories, fictional characters, or narrative arcs. Focus on practical advice, frameworks, case studies, or actionable steps.
5. Each chapter should be structured to work well as audio content (2000-4000 words when written).
6. Include key learning objectives and practical takeaways for each chapter.

${outlineGuidance}

Respond ONLY with a valid JSON array in this format:
[
  {
    "chapterNumber": 1,
    "title": "Chapter Title",
    "summary": "Detailed summary explaining what the reader will learn and key concepts covered",
    "keyPoints": ["Key learning point 1", "Key learning point 2", "Key takeaway 3"],
    "estimatedWordCount": 3000
  }
]`;
    } else {
      // Fiction outline prompt (from old system)
      outlinePrompt = `You are an expert book editor tasked with creating a chapter-by-chapter outline for a book. You must generate EXACTLY ${chapterCount} chapters—no more, no less. The outline must form a complete story arc with a clear beginning, middle, and end, tailored to the provided details. The first chapter must introduce the main character(s), setting, and initial conflict. The middle chapters must build tension and develop the plot. The final chapter must resolve the main conflict and provide a satisfying conclusion.

Book Details:
- Title: ${title}
- Genre: ${genre}
- Description: ${description}
- Target Audience: ${Array.isArray(targetAudience) ? targetAudience.join(', ') : targetAudience || 'General audience'}
- Number of Chapters: ${chapterCount}

Requirements:
1. Produce EXACTLY ${chapterCount} chapters. Do not deviate from this number under any circumstances.
2. Each chapter must have a title (max 50 characters) and a summary (100-150 words) that advances the story.
3. The narrative must flow logically from chapter to chapter, maintaining a cohesive arc from introduction to resolution.
4. Avoid placeholders, generic summaries, or incomplete arcs. Every chapter must be specific and contribute to the story.
5. Each chapter should be structured to work well as audio content (2000-4000 words when written).
6. Focus on strong hooks, emotional beats, and character development suitable for audio consumption.

${outlineGuidance}

Respond ONLY with a valid JSON array in this format:
[
  {
    "chapterNumber": 1,
    "title": "Chapter Title",
    "summary": "Detailed summary of plot events, character development, and story progression",
    "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
    "estimatedWordCount": 3000
  }
]`;
    }
    
    // Build user prompt with all context
    const userPrompt = `${outlinePrompt}

${existingOutline ? `\nExisting outline to improve upon:\n${JSON.stringify(existingOutline, null, 2)}` : ''}`;

    // Use the proven system from old Biglio
    const systemPrompt = `You are Biglio, an AI writing assistant for books. Never say you are Claude, Anthropic, or any other company. Respond ONLY with valid JSON - no explanations or additional text.`;
    
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