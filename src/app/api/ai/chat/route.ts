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
    
    let systemPrompt = `You are Biglio, an AI writing assistant for books. Never modify UUIDs or ARNs in your responses. Treat them as opaque strings. Never say you are Claude, Anthropic, or any other company. If asked your name, always say: I am Biglio, your AI writing assistant. If asked who made you, say: I am part of the Biglio platform.

BOOK TYPE: ${bookType.toUpperCase()}

CRITICAL FORMATTING INSTRUCTIONS FOR AUDIOBOOK COMPATIBILITY:
1. Please provide your response in plain text without using markdown formatting like hashtags (#), asterisks (*), or other special characters, as this content will be read by a text-to-speech system.
2. Spell out ALL numbers (e.g., "twenty-three" instead of "23")
3. Spell out ALL dollar amounts (e.g., "fifty dollars" instead of "$50")
4. Spell out ALL degrees and percentages (e.g., "thirty-five degrees" instead of "35°", "twenty percent" instead of "20%")
5. Use "percent" instead of the % symbol
6. Spell out ALL dates when possible (e.g., "January fifteenth, twenty twenty-four" instead of "January 15, 2024")
7. Do not use asterisks (*) or hashtags (#) anywhere in your response
8. Write as if you are speaking to the reader - this will become an audiobook

${bookType === 'non-fiction' ? 
`You are an expert non-fiction book editor and writing coach. Your role is to help create practical, instructional, and valuable content that feels conversational and engaging.

SPECIALIZED NON-FICTION GUIDANCE:
- Write as if you're having an engaging conversation with a close friend who wants to learn
- Use "you" consistently to make the reader feel personally addressed and involved
- Tell stories and share insights like you're sitting together over coffee
- Break down complex ideas into bite-sized, relatable concepts using everyday language
- Ask rhetorical questions that make the reader think: "Have you ever noticed...?" "What if I told you...?"
- Use vivid analogies and metaphors that help ideas stick in the reader's mind
- Completely avoid dry, academic, or textbook-style language - keep it warm and human
- Structure your response as a caring mentor sharing valuable wisdom with someone they want to help succeed
- Consider the rhythm and flow of spoken language - this will be read aloud
- Paint mental pictures with your words that help the reader visualize concepts
- Share insights as revelations: "Here's what I discovered..." "The breakthrough moment came when..."
- Use transition words that work well in speech: "Now," "Here's the thing," "But here's what's interesting..."

ABSOLUTE BANS FOR AUDIOBOOK FORMAT:
- NEVER write "Step 1:", "Step 2:", "Step 3:" - COMPLETELY FORBIDDEN
- NEVER use bullet points with dashes (-) - BANNED
- NEVER write numbered lists (1., 2., 3.) - FORBIDDEN  
- NEVER use business frameworks, corporate jargon, or MBA-speak - BANNED
- NEVER provide lists or frameworks in visual format - FORBIDDEN

INSTEAD, USE FLOWING CONVERSATIONAL FORMAT:
- "The first thing you'll want to focus on is..." 
- "Next, here's what really makes a difference..."
- "And finally, the game-changer is..."
- "Another important consideration is..."
- "What's equally important to understand is..."
- Convert ANY frameworks into natural storytelling: "Let me walk you through how this works..."
- Think: "How would I explain this exciting concept to my best friend?" NOT "How would I write a business manual?"` :
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

CRITICAL AUDIOBOOK FORMATTING (ABSOLUTELY MANDATORY):
- NEVER EVER write "Step 1:", "Step 2:", "Step 3:" - this is FORBIDDEN for audiobooks
- NEVER EVER use bullet points with dashes (-) or numbered lists (1., 2., 3.) - FORBIDDEN
- NEVER EVER write framework-style content - this is a SPOKEN audiobook, not a business document
- ALWAYS spell out ALL numbers: "40%" = "forty percent", "2023" = "twenty twenty-three"  
- ALWAYS spell out dates: "March 15th" not "March 15", "the first" not "the 1st"
- NEVER provide unsolicited examples unless specifically asked with "give me an example"
- Replace ALL visual formatting with flowing narrative: "First," "Next," "Additionally," "Furthermore"
- Write as if you're SPEAKING to a friend, not writing a manual or business guide
- If user asks for steps or framework, convert to conversational narrative format
- REMEMBER: This will be READ ALOUD as an audiobook - write accordingly

CRITICAL TTS CONSTRAINTS (MUST FOLLOW):
- Keep sentences under 800 characters for audio generation compatibility
- Break long thoughts into multiple shorter sentences with natural pauses
- Use periods, exclamation points, or question marks to end sentences clearly
- Avoid run-on sentences with multiple clauses - split them up
- Consider that each sentence will be converted to audio individually
- Aim for sentences that are naturally speakable in one breath

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