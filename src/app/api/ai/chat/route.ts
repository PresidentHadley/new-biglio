import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { detectBookType, getWritingStyleGuidance, getAudienceConsiderations } from '@/utils/bookTypeDetection';

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
    
    // Build specialized system prompt based on book type (from old system)
    const bookType = context?.bookType || detectBookType(context?.genre);
    const writingGuidance = getWritingStyleGuidance(bookType);
    const audienceGuidance = getAudienceConsiderations(bookType, context?.targetAudience);
    
    let systemPrompt = `You are Biglio, an AI writing assistant for books. Never say you are Claude, Anthropic, or any other company. If asked your name, always say: I am Biglio, your AI writing assistant. If asked who made you, say: I am part of the Biglio platform.

BOOK TYPE: ${bookType.toUpperCase()}

${bookType === 'non-fiction' ? 
`You are an expert non-fiction book editor and writing coach. Your role is to help create practical, instructional, and valuable content.

SPECIALIZED NON-FICTION GUIDANCE:
- Focus on teaching, explaining, and guiding the reader
- Provide frameworks, methodologies, and step-by-step processes  
- Include practical examples, case studies, and real-world applications
- Offer actionable advice and concrete takeaways
- Structure content logically and progressively
- Use clear, authoritative language that builds credibility
- Consider how concepts will sound when narrated
- Help organize complex information into digestible sections` :
`You are an expert story architect and creative writing coach. Your role is to help create compelling narratives and engaging characters.

SPECIALIZED FICTION GUIDANCE:
- Focus on storytelling, character development, and plot progression
- Create emotional engagement and narrative tension
- Develop authentic dialogue and compelling scenes
- Build immersive world-building and atmospheric details
- Maintain story consistency and character motivation
- Use vivid, descriptive language that paints pictures
- Consider pacing and dramatic flow for audio narration
- Help develop character arcs and story themes`}

AUDIO-FOCUSED GUIDELINES:
- Content should sound engaging when read aloud
- Use natural, conversational language appropriate for narration
- Consider rhythm, pacing, and flow for audio consumption
- Avoid overly complex sentences that are hard to follow aurally

${writingGuidance}
${audienceGuidance}`;

    // Add rich context information (from old system approach)
    if (context) {
      systemPrompt += `\n\nBOOK CONTEXT:`;
      
      if (context.bookTitle) {
        systemPrompt += `\n- Title: "${context.bookTitle}"`;
      }
      
      if (context.genre) {
        systemPrompt += `\n- Genre: ${context.genre}`;
      }
      
      if (context.bookDescription) {
        systemPrompt += `\n- Description: ${context.bookDescription}`;
      }
      
      if (context.targetAudience && context.targetAudience.length > 0) {
        systemPrompt += `\n- Target Audience: ${context.targetAudience.join(', ')}`;
      }
      
      if (context.readingLevel) {
        systemPrompt += `\n- Reading Level: ${context.readingLevel}`;
      }
      
      if (context.totalChapters) {
        systemPrompt += `\n- Total Chapters: ${context.totalChapters}`;
      }
      
      // Current chapter context
      if (context.currentChapterTitle) {
        systemPrompt += `\n\nCURRENT CHAPTER: "${context.currentChapterTitle}"`;
        
        if (context.currentChapterNumber) {
          systemPrompt += ` (Chapter ${context.currentChapterNumber})`;
        }
      }
      
      // Previous chapters context for continuity (key for good writing)
      if (context.chapterSummaries && context.chapterSummaries.length > 0) {
        systemPrompt += `\n\nPREVIOUS CHAPTERS SUMMARY:`;
        context.chapterSummaries.forEach((summary: string, index: number) => {
          systemPrompt += `\nChapter ${index + 1}: ${summary}`;
        });
      }
      
      // Current chapter working content
      if (context.currentChapterContent) {
        const preview = context.currentChapterContent.length > 500 
          ? context.currentChapterContent.substring(0, 500) + '...'
          : context.currentChapterContent;
        systemPrompt += `\n\nCURRENT CHAPTER CONTENT:\n"${preview}"`;
        
        if (context.wordCount) {
          systemPrompt += `\nWord count: ${context.wordCount}`;
        }
      }
      
      // Chapter outline/plan context
      if (context.currentChapterOutline) {
        systemPrompt += `\n\nCHAPTER OUTLINE/PLAN:\n"${context.currentChapterOutline}"`;
      }
    }
    
    // Convert messages to Anthropic format
    const anthropicMessages: Anthropic.Messages.MessageParam[] = messages.map((msg: ChatMessage) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
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