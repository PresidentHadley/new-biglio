import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { detectBookType, getOutlineGuidance } from '@/utils/bookTypeDetection';

const anthropic = new Anthropic({
  apiKey: process.env.BOOK_ANTHROPIC_API!,
});

// Helper function to convert numbers to words for TTS
function numberToWords(num: number): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const hundreds = ['', 'one hundred', 'two hundred', 'three hundred', 'four hundred', 'five hundred', 'six hundred', 'seven hundred', 'eight hundred', 'nine hundred'];

  if (num === 0) return 'zero';
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return tens[ten] + (one ? '-' + ones[one] : '');
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    return hundreds[hundred] + (remainder ? ' ' + numberToWords(remainder) : '');
  }
  
  // For larger numbers, just return the string version
  return num.toString();
}

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
    let aiResponse = responseContent.type === 'text' ? responseContent.text : '';
    
    // Apply content filtering/sanitization (from old system)
    // Convert abbreviated measurements to fully spelled out versions for TTS
    aiResponse = aiResponse.replace(/(\d+)°?f\b/gi, (match, num) => {
      const number = parseInt(num);
      return `${numberToWords(number)} degrees Fahrenheit`;
    });
    aiResponse = aiResponse.replace(/(\d+)°?c\b/gi, (match, num) => {
      const number = parseInt(num);
      return `${numberToWords(number)} degrees Celsius`;
    });
    aiResponse = aiResponse.replace(/(\d+)\s*oz\b/gi, (match, num) => {
      const number = parseInt(num);
      return `${numberToWords(number)} ounce${number !== 1 ? 's' : ''}`;
    });
    aiResponse = aiResponse.replace(/(\d+)\s*g\b/gi, (match, num) => {
      const number = parseInt(num);
      return `${numberToWords(number)} gram${number !== 1 ? 's' : ''}`;
    });
    aiResponse = aiResponse.replace(/(\d+)\s*lbs?\b/gi, (match, num) => {
      const number = parseInt(num);
      return `${numberToWords(number)} pound${number !== 1 ? 's' : ''}`;
    });
    
    // Filter common AI buzzwords in outline content
    aiResponse = aiResponse.replace(/\bdelve into\b/gi, 'explore');
    aiResponse = aiResponse.replace(/\bdelve deeper\b/gi, 'explore further');
    aiResponse = aiResponse.replace(/\butilize\b/gi, 'use');
    aiResponse = aiResponse.replace(/\bcommence\b/gi, 'begin');
    aiResponse = aiResponse.replace(/\bunveil\b/gi, 'reveal');
    aiResponse = aiResponse.replace(/\bcomprehensive\b/gi, 'complete');
    
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