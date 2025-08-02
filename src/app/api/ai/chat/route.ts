import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.BOOK_ANTHROPIC_API!,
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = await request.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }
    
    // Build system prompt with context
    let systemPrompt = `You are an expert book writing assistant. You help authors create engaging, well-structured content for audiobooks.

Key guidelines:
- Focus on creating content that sounds great when read aloud
- Use conversational, engaging language
- Provide specific, actionable suggestions
- Help maintain consistency in tone and style
- Consider pacing and flow for audio consumption`;

    if (context) {
      systemPrompt += `\n\nContext about this book:\n${JSON.stringify(context, null, 2)}`;
    }
    
    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((msg: ChatMessage) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: anthropicMessages
    });
    
    const responseContent = response.content[0];
    const aiMessage = responseContent.type === 'text' ? responseContent.text : '';
    
    return NextResponse.json({
      success: true,
      message: aiMessage,
      usage: response.usage
    });
    
  } catch (error) {
    console.error('AI chat error:', error);
    
    return NextResponse.json(
      { 
        error: 'AI chat failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}