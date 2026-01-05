import type { DecisionNode } from './types';

// Import OpenAI with proper typing
type OpenAIInstance = {
  chat: {
    completions: {
      create: (params: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
        max_tokens?: number;
        presence_penalty?: number;
      }) => Promise<{
        choices: Array<{
          message?: {
            content?: string | null;
          };
        }>;
      }>;
    };
  };
};

let OpenAI: any = null;
let openai: OpenAIInstance | null = null;

// Lazy load OpenAI to avoid build-time errors
function getOpenAI(): OpenAIInstance | null {
  if (openai) {
    return openai;
  }

  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    // Dynamic import for Next.js compatibility
    const OpenAIModule = require('openai');
    OpenAI = OpenAIModule.default || OpenAIModule;
    
    if (OpenAI) {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      }) as OpenAIInstance;
      return openai;
    }
  } catch (error) {
    console.warn('OpenAI package not available or failed to initialize:', error);
    return null;
  }

  return null;
}

export interface ConversationContext {
  currentNode: DecisionNode;
  conversationHistory: Array<{
    speaker: 'user' | 'bot';
    text: string;
    timestamp: number;
  }>;
  scenarioContext?: string;
  userMessage: string;
}

export class AIService {
  /**
   * Generate a contextual AI response based on conversation history and flow structure
   */
  async generateContextualResponse(context: ConversationContext): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not set, falling back to scripted response');
      return this.getFallbackResponse(context.currentNode);
    }

    try {
      // Build system prompt based on the current node and flow structure
      const systemPrompt = this.buildSystemPrompt(context);
      
      // Build conversation history for context
      const messages = this.buildMessages(context, systemPrompt);

      const openaiClient = getOpenAI();
      if (!openaiClient) {
        return this.getFallbackResponse(context.currentNode);
      }

      const completion = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0.8, // Higher temperature for more natural, varied responses
        max_tokens: 1000, // Increased from 200 to allow longer, more complete responses
        presence_penalty: 0.6, // Encourage variety in responses
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      if (!response) {
        return this.getFallbackResponse(context.currentNode);
      }

      return response;
    } catch (error) {
      console.error('Error generating AI response:', error);
      return this.getFallbackResponse(context.currentNode);
    }
  }

  /**
   * Build system prompt that guides the AI to act as a prospect following the flow
   */
  private buildSystemPrompt(context: ConversationContext): string {
    const node = context.currentNode;
    const scenarioContext = context.scenarioContext || 
      "You are a mortgage prospect (homebuyer) on a sales call with a mortgage sales agent. You're interested in getting a mortgage but cautious, and you respond naturally to the sales agent's questions. You may have concerns about rates, down payments, credit scores, or the overall process. Respond as a real person would - sometimes interested, sometimes skeptical, sometimes asking questions.";

    let prompt = `${scenarioContext}\n\n`;
    prompt += `Current conversation stage: ${node.label} (${node.category})\n\n`;
    
    if (node.clarificationPrompt) {
      prompt += `Context: ${node.clarificationPrompt}\n\n`;
    }

    // Add guidance based on node type
    if (node.type === 'bot') {
      prompt += `You should respond as the prospect would at this stage. `;
      
      if (node.expectedIntents && node.expectedIntents.length > 0) {
        prompt += `The sales agent is likely trying to: ${node.expectedIntents.map(i => i.label).join(', ')}.\n\n`;
      }

      // Include example responses as style guidance (but don't copy them exactly)
      if (node.botResponses && node.botResponses.length > 0) {
        prompt += `Your response should be similar in tone and intent to these examples, but feel free to be more natural and contextual:\n`;
        node.botResponses.slice(0, 2).forEach((example, i) => {
          prompt += `- Example ${i + 1}: "${example}"\n`;
        });
        prompt += `\n`;
      }

      prompt += `Respond naturally based on what the sales agent just said. `;
      prompt += `If they asked a question, answer it. If they made a statement, respond appropriately. `;
      prompt += `If you're confused or need clarification, ask for it. `;
      prompt += `Keep your response conversational, brief (1-2 sentences), and realistic. `;
      prompt += `Don't just follow a script - actually respond to what they said.\n\n`;
    }

    prompt += `Important: Your response should directly address what the sales agent just said. `;
    prompt += `If they asked about something specific, answer that. If they asked for clarification, provide it. `;
    prompt += `Be natural and human-like, not robotic.`;

    return prompt;
  }

  /**
   * Build messages array for OpenAI API
   */
  private buildMessages(context: ConversationContext, systemPrompt: string): Array<any> {
    const messages: Array<any> = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Add conversation history (last 10 turns for context)
    const recentHistory = context.conversationHistory.slice(-10);
    
    for (const turn of recentHistory) {
      messages.push({
        role: turn.speaker === 'user' ? 'user' : 'assistant',
        content: turn.text,
      });
    }

    // Add the current user message
    messages.push({
      role: 'user',
      content: context.userMessage,
    });

    return messages;
  }

  /**
   * Fallback to scripted response if AI fails
   */
  private getFallbackResponse(node: DecisionNode): string {
    if (node.botResponses && node.botResponses.length > 0) {
      const randomIndex = Math.floor(Math.random() * node.botResponses.length);
      return node.botResponses[randomIndex];
    }
    return "I'm not sure how to respond to that.";
  }

  /**
   * Detect intent using AI for better accuracy
   */
  async detectIntentWithAI(
    userMessage: string,
    currentNode: DecisionNode,
    conversationHistory: Array<{ speaker: 'user' | 'bot'; text: string }>
  ): Promise<string> {
    if (!process.env.OPENAI_API_KEY || !currentNode.expectedIntents || currentNode.expectedIntents.length === 0) {
      return 'default';
    }

    try {
      const intentOptions = currentNode.expectedIntents.map(intent => 
        `- ${intent.id}: ${intent.label} (examples: ${intent.examples.slice(0, 3).join(', ')})`
      ).join('\n');

      const systemPrompt = `You are analyzing a sales conversation. Determine which intent best matches what the sales agent just said.

Available intents for this stage:
${intentOptions}

Respond with ONLY the intent ID (e.g., "asks_desired_outcome") or "default" if none match.`;

      const recentHistory = conversationHistory.slice(-5).map(turn => 
        `${turn.speaker === 'user' ? 'Agent' : 'Prospect'}: ${turn.text}`
      ).join('\n');

      const openaiClient = getOpenAI();
      if (!openaiClient) {
        return 'default';
      }

      const completion = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Conversation:\n${recentHistory}\n\nAgent: ${userMessage}\n\nWhich intent?` },
        ],
        temperature: 0.3, // Lower temperature for more consistent intent detection
        max_tokens: 50,
      });

      const detectedIntent = completion.choices[0]?.message?.content?.trim().toLowerCase();
      
      // Validate the intent exists
      if (detectedIntent && currentNode.expectedIntents.some(i => i.id === detectedIntent)) {
        return detectedIntent;
      }

      return 'default';
    } catch (error) {
      console.error('Error detecting intent with AI:', error);
      return 'default';
    }
  }
}

