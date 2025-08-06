import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { detectBookType } from '@/utils/bookTypeDetection';

const anthropic = new Anthropic({
  apiKey: process.env.BOOK_ANTHROPIC_API!,
});

interface ChapterSummaryOptions {
  bookTitle: string;
  bookGenre?: string;
  bookType?: 'fiction' | 'non-fiction';
  chapterTitle: string;
  chapterOrder: number;
  chapterContent: string;
  targetAudience?: string[];
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.BOOK_ANTHROPIC_API) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const options: ChapterSummaryOptions = await request.json();
    
    const {
      bookTitle,
      bookGenre,
      bookType: inputBookType,
      chapterTitle,
      chapterOrder,
      chapterContent,
      targetAudience
    } = options;

    if (!chapterContent || chapterContent.trim().length < 100) {
      return NextResponse.json(
        { error: 'Chapter content too short for summary generation' },
        { status: 400 }
      );
    }

    // Detect book type for specialized summarization
    const bookType = inputBookType || detectBookType(bookGenre);
    
    // Build summary prompt based on old system (enhanced)
    let prompt = `Please create a detailed summary of this chapter content for use in AI-assisted writing. This summary will help the AI understand what has happened in the story/content so far.

Book Information:
- Title: "${bookTitle}"
- Genre: ${bookGenre || 'Unspecified'}
- Type: ${bookType}
- Target Audience: ${targetAudience ? targetAudience.join(', ') : 'General'}

Chapter Information:
- Chapter ${chapterOrder}: "${chapterTitle}"
- Word Count: ~${chapterContent.trim().split(/\s+/).length} words

Chapter Content:
${chapterContent}

---

SUMMARY REQUIREMENTS:
`;

    if (bookType === 'non-fiction') {
      prompt += `
Create a comprehensive summary that includes:
1. Main topics and concepts covered
2. Key points and takeaways presented
3. Examples, case studies, or illustrations used
4. Any frameworks, methodologies, or processes explained
5. Important data, statistics, or research mentioned
6. Actionable advice or recommendations given
7. How this chapter connects to the overall book theme

Format as a detailed paragraph (100-200 words) that captures the essential content and learning objectives.`;
    } else {
      prompt += `
Create a comprehensive summary that includes:
1. Plot events and story progression
2. Character development and interactions
3. New characters introduced or existing ones developed
4. Setting changes or important locations
5. Conflicts introduced, developed, or resolved
6. Key dialogue or revelations
7. Emotional beats and character motivations
8. Foreshadowing or plot setup for future chapters

Format as a detailed paragraph (100-200 words) that captures the essential story elements and character development.`;
    }

    prompt += `

IMPORTANT: This summary should be much more detailed than a basic chapter description. Include specific details that would help an AI understand the full context when providing writing suggestions for future chapters.`;

    const systemPrompt = `You are Biglio, an AI writing assistant specialized in creating detailed chapter summaries for book development. Provide comprehensive, context-rich summaries that will enhance future AI writing assistance.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const responseContent = response.content[0];
    const summary = responseContent.type === 'text' ? responseContent.text.trim() : '';

    if (!summary) {
      throw new Error('Failed to generate chapter summary');
    }

    console.log(`✓ Generated summary for Chapter ${chapterOrder}: "${chapterTitle}" (${summary.length} characters)`);

    return NextResponse.json({
      success: true,
      summary,
      chapterOrder,
      chapterTitle,
      wordCount: chapterContent.trim().split(/\s+/).length
    });

  } catch (error) {
    console.error('[SUMMARY API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate chapter summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}