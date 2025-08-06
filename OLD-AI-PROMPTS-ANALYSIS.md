# 🧠 OLD BIGLIO AI PROMPTS ANALYSIS

## 📋 Overview
This document analyzes the AI prompts and writing assistance system from the old Biglio V1 system to improve our new V2 implementation. The old system showed better non-fiction writing performance, and this analysis will help us understand why.

## 🎯 Key Findings

### 🔑 **Why Old Non-Fiction Writing Was Better**

1. **Specialized Prompts**: The old system had distinct, detailed prompts for Fiction vs Non-Fiction
2. **Context-Aware**: Rich book context including genre, target audience, and book type
3. **Detailed Chapter Summaries**: Comprehensive summary generation for AI context
4. **Progressive Structure**: Clear outline → detailed content → AI assistance flow

---

## 📚 CORE AI SYSTEM PROMPTS

### 🎭 **Main System Identity (from lambda)**
```javascript
const systemPrompt = `You are Biglio, a versatile AI assistant that can help with almost anything, including creating great audio content.

### Core Identity
- Be friendly, helpful, and conversational for all general questions
- If asked about AI technologies, simply redirect by saying you are BIGLIO, never mention any other technology other than biglio.
- When users specifically ask for help with audio content, switch to content creation mode

### First Message Only
- Start with: "Hi there! I'm Biglio, your helpful assistant. I can chat about almost anything, and I'm also great at helping create audio content ideas. What can I help you with today?"

### Content Creation Mode (Only when requested)
- When users specifically ask for help with audio content, switch to this mode
- Format your response with:
  **Title:** [Clear, Relevant Title]
  **Details:** [Content description - what to include, key points, style]
- Keep the details concise (1400 characters or less)
- Skip explanations and just provide the formatted prompt`;
```

### 🎪 **Book Writing Assistant Identity**
```javascript
system: `You are Biglio, an AI writing assistant for books. Never say you are Claude, Anthropic, or any other company. If asked your name, always say: I am Biglio, your AI writing assistant. If asked who made you, say: I am part of the Biglio platform. Never mention Anthropic or Claude, even if asked directly. Always say you are Biglio. ${context}`
```

---

## 📖 OUTLINE GENERATION PROMPTS

### 📚 **Non-Fiction Outline Prompt (SUPERIOR)**
```javascript
outlinePrompt = `You are an expert book editor tasked with creating a chapter-by-chapter outline for a NON-FICTION book. Do NOT write a story or use fictional characters. Instead, generate a practical, instructional, or informational outline with chapters and key points appropriate for a non-fiction book in the "${genre}" genre.

Book Details:
- Title: ${title}
- Genre: ${genre}
- Type: Non-Fiction
- Description: ${description}
- Target Audience: ${targetAudience}
- Number of Chapters: ${chapterCount}
- Reference Blurb (optional): ${blurb || ''}

Requirements:
1. Produce EXACTLY ${chapterCount} chapters. Do not deviate from this number under any circumstances.
2. Each chapter must have a clear, descriptive title (max 50 characters) and a summary (100-150 words) that teaches, explains, or guides the reader on a specific topic.
3. The outline should be logical, progressive, and cover the subject matter thoroughly.
4. Avoid stories, fictional characters, or narrative arcs. Focus on practical advice, frameworks, case studies, or actionable steps.
5. Generate a compelling back-cover blurb (100-200 characters) summarizing the book's value and hook.

Respond ONLY with a valid JSON object in this format:
{
  "blurb": "string",
  "chapters": [
    { "title": "string", "summary": "string" },
    ...
  ]
}`;
```

### 🎭 **Fiction Outline Prompt**
```javascript
outlinePrompt = `You are an expert book editor tasked with creating a chapter-by-chapter outline for a book. You must generate EXACTLY ${chapterCount} chapters—no more, no less. The outline must form a complete story arc with a clear beginning, middle, and end, tailored to the provided details. The first chapter must introduce the main character(s), setting, and initial conflict. The middle chapters must build tension and develop the plot. The final chapter must resolve the main conflict and provide a satisfying conclusion.

Book Details:
- Title: ${title}
- Genre: ${genre}
- Description: ${description}
- Target Audience: ${targetAudience}
- Number of Chapters: ${chapterCount}

Requirements:
1. Produce EXACTLY ${chapterCount} chapters. Do not deviate from this number under any circumstances.
2. Each chapter must have a title (max 50 characters) and a summary (100-150 words) that advances the story.
3. The narrative must flow logically from chapter to chapter, maintaining a cohesive arc from introduction to resolution.
4. Generate a compelling back-cover blurb (100-200 characters) summarizing the book's premise and hook.

Respond ONLY with a valid JSON object in this format:
{
  "blurb": "string",
  "chapters": [
    { "title": "string", "summary": "string" },
    ...
  ]
}`;
```

---

## 📝 CHAPTER SUMMARY GENERATION

### 🎯 **Chapter Summary Prompt System**
```typescript
function buildSummaryPrompt(options: ChapterSummaryOptions): string {
  const { bookTitle, bookGenre, chapterTitle, chapterOrder, chapterContent, bookType } = options;
  
  let prompt = `Please create a detailed summary of this chapter content for use in AI-assisted writing. This summary will help the AI understand what has happened in the story/content so far.

Book Information:
- Title: "${bookTitle}"
- Genre: ${bookGenre || 'Unspecified'}
- Type: ${bookType || 'Fiction'}

Chapter Information:
- Chapter ${chapterOrder}: "${chapterTitle}"
- Word Count: ~${chapterContent.trim().split(/\s+/).length} words

Chapter Content:
${chapterContent}

---

SUMMARY REQUIREMENTS:
`;

  if (bookType === 'Non-Fiction') {
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

  return prompt;
}
```

---

## 🤖 AI CONTEXT MODES

### 📊 **Context Mode System (from old AIContext)**
```typescript
export enum AIContextMode {
  CHAPTER = 'chapter',
  FULL_BOOK = 'full_book'
}

// Context building logic
const buildAIContext = () => {
  if (contextMode === AIContextMode.FULL_BOOK) {
    // Include full book context: all chapters, metadata, progress
    return fullBookContext;
  } else {
    // Focus only on current chapter context
    return chapterContext;
  }
};
```

---

## 🎪 WRITING PROMPT TYPES

### 📝 **Old AI Prompt Types**
```typescript
const generatePrompt = (type: AIPromptType): string => {
  switch (type) {
    case AIPromptType.CHAPTER_IDEA:
      return `Generate three creative ideas for a new chapter in my book. Focus on advancing the plot in an interesting way.`;
    case AIPromptType.PLOT_DEVELOPMENT:
      return `Help me develop the plot further from the current point. What interesting complications or twists could I introduce?`;
    case AIPromptType.CHARACTER_DEVELOPMENT:
      return `Suggest ways to develop the character's arc in this chapter. How can I show growth or change?`;
    case AIPromptType.STYLE_IMPROVEMENT:
      return `Please analyze my writing style in this chapter and suggest improvements for clarity, engagement, and flow.`;
    case AIPromptType.GENERAL:
    default:
      return `I'm working on my book${chapterId ? ' and specifically this chapter' : ''}. Can you help me with some creative ideas?`;
  }
};
```

---

## 🔧 TECHNICAL IMPLEMENTATION

### 🚀 **API Configuration**
- **Model**: `claude-3-7-sonnet-20250219` (older, possibly better for creative writing)
- **Max Tokens**: 1000
- **Context Management**: Smart truncation for large contexts
- **Token Estimation**: `Math.ceil(text.length / 4)`
- **Token Limit**: ~12,000 tokens

### 📱 **Context Optimization**
```typescript
const optimizeContext = (fullContext: string, userMessage: string): string => {
  if (!isContextTooLarge(fullContext)) {
    return fullContext;
  }
  
  // Extract metadata and current chapter focus
  const metadata = fullContext.match(/Book Metadata:[\s\S]*?(?=\n\n)/);
  const currentChapterFocus = fullContext.match(/Currently focused on:[\s\S]*?(?=\n\n)/);
  
  // Truncate chapter content but keep outlines
  const truncatedChapterSections = chapterSections.map(section => {
    const contentPreview = content.split(/\s+/).slice(0, 150).join(' ');
    return `${title}\n${outline}\nCONTENT: ${contentPreview}...\n[Content truncated for brevity]\n`;
  });
  
  return optimizedContext;
};
```

---

## 🎯 KEY DIFFERENCES FROM NEW SYSTEM

### ❌ **What We're Missing in V2**

1. **Specialized Non-Fiction Prompts**: Our current system doesn't distinguish between fiction and non-fiction writing styles
2. **Rich Chapter Summaries**: We don't generate detailed summaries for AI context
3. **Progressive Context Building**: The old system built context progressively with book metadata
4. **Detailed Outline Content**: Old system had both outline_content AND summary fields
5. **Context Mode Switching**: Full book vs chapter-focused context modes

### ✅ **What We Need to Implement**

1. **Book Type Detection**: Automatic fiction vs non-fiction classification
2. **Genre-Specific Prompts**: Different writing assistance based on book genre and type
3. **Enhanced Context System**: Include book metadata, target audience, and previous chapter summaries
4. **Better Outline Generation**: Use the superior non-fiction outline prompt system
5. **Chapter Summary Pipeline**: Generate AI summaries for completed chapters

---

## 🚀 RECOMMENDED IMPROVEMENTS FOR V2

### 1. **Update AI Context System**
- Add book type and genre to AI context
- Include target audience in prompts
- Generate and use chapter summaries for context

### 2. **Implement Specialized Prompts**
- Use different prompt templates for fiction vs non-fiction
- Add genre-specific writing guidance
- Include target audience considerations

### 3. **Enhance Outline Generation**
- Use the proven non-fiction outline prompt
- Add book metadata to outline generation
- Include practical/instructional focus for non-fiction

### 4. **Add Context Modes**
- Chapter-focused vs full-book context modes
- Smart context truncation for large books
- Progressive context building

### 5. **Improve Writing Assistance**
- Mode-aware prompts (outline vs writing mode)
- Book type-specific writing suggestions
- Better integration of previous chapter context

---

## 📋 NEXT STEPS FOR TOMORROW

1. **Implement Book Type Detection** in AI context
2. **Add Specialized Non-Fiction Prompts** to AI assistant
3. **Enhance Context Building** with book metadata
4. **Update Outline Generation** with old system prompts
5. **Add Chapter Summary Pipeline** for better AI context
6. **Test Non-Fiction Writing Performance** with new prompts

---

## 🔑 **Key Insight**
The old system's superior non-fiction writing came from **specialized prompts** that understood the fundamental difference between instructional/practical content vs narrative content. The new system treats all writing the same, which dilutes the quality for non-fiction specifically.