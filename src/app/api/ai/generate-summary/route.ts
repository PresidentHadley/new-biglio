import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.BOOK_ANTHROPIC_API!,
});

export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Chapter title and content are required' },
        { status: 400 }
      );
    }

    const prompt = `Please create a concise summary of this chapter for AI context purposes. The summary should capture the key events, character developments, plot points, and any important details that would be relevant for writing subsequent chapters.

Chapter Title: "${title}"

Chapter Content:
${content}

Please provide a summary that is:
- 2-3 sentences maximum
- Focuses on plot progression and character development
- Includes key events that affect the story
- Written in third person narrative style
- Concise but informative for AI context

Summary:`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const summary = response.content[0];
    if (summary.type !== 'text') {
      throw new Error('Unexpected response format from AI');
    }

    return NextResponse.json({ 
      summary: summary.text.trim()
    });

  } catch (error) {
    console.error('Error generating chapter summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate chapter summary' },
      { status: 500 }
    );
  }
}