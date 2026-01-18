/**
 * Mock AI Provider - Returns safe, structured mock responses
 * Used when AI is disabled or misconfigured
 */

import {
  TaskDraftInput,
  TaskDraftResponse,
  FeedbackDraftInput,
  FeedbackDraftResponse,
  RewriteInput,
  RewriteResponse,
  StudentHintInput,
  StudentHintResponse,
} from '../types'

export async function generateTaskDraft(input: TaskDraftInput): Promise<TaskDraftResponse> {
  const topic = input.subject || input.brief || 'the topic'
  const time = input.timeEstimate || 'the estimated time'
  const support = input.supportNeeds || 'Standard support'

  return {
    title: `Task: ${topic}`,
    instructions: `Complete this task about ${topic}. This activity is designed to help you develop your skills and understanding. Take approximately ${time} to complete it. ${support !== 'Standard support' ? `Additional support considerations: ${support}` : ''}`,
    steps: [
      'Review the task requirements and materials',
      'Plan your approach and gather any needed resources',
      'Complete the main task components',
      'Review your work for completeness and quality',
      'Reflect on what you learned and any challenges you faced',
    ],
    differentiation: {
      easier: `For this version, focus on the core concepts. Break the task into smaller steps and take your time. Use available resources and ask for support when needed.`,
      standard: `Complete all required components with attention to detail. Show your understanding through clear explanations and examples.`,
      stretch: `Go beyond the basic requirements. Explore connections to other topics, apply critical thinking, and demonstrate deeper understanding.`,
    },
    successCriteria: [
      'Complete all required components',
      'Demonstrate understanding of key concepts',
      'Show effort and engagement with the task',
      'Apply skills appropriately',
      'Reflect on learning and challenges',
    ],
  }
}

export async function generateFeedbackDraft(input: FeedbackDraftInput): Promise<FeedbackDraftResponse> {
  const submissionLength = input.studentSubmission.length
  const hasContent = submissionLength > 50

  return {
    options: [
      {
        title: 'Encouraging',
        text: hasContent
          ? `Good work on completing this task. You've shown understanding of the key concepts. Consider adding more detail to strengthen your response.`
          : `Thank you for your submission. To improve, try expanding on your ideas with more examples or explanations.`,
      },
      {
        title: 'Constructive',
        text: hasContent
          ? `Your submission demonstrates effort. To take it further, try connecting your ideas to the success criteria and providing specific examples.`
          : `You've made a start. Next time, aim to provide more detail and examples to show your understanding.`,
      },
      {
        title: 'Next Steps',
        text: `Continue building on what you've learned. Consider reviewing the success criteria and identifying areas where you can add more depth.`,
      },
    ],
    nextStep: hasContent
      ? 'Review the success criteria and identify one area to expand with more detail or examples.'
      : 'Start by outlining your main ideas, then expand each one with examples or explanations.',
    starsSuggestion: hasContent ? 3 : 2,
  }
}

export async function rewriteForAccessibility(input: RewriteInput): Promise<RewriteResponse> {
  const { text, mode } = input

  switch (mode) {
    case 'simplify':
      return {
        rewrittenText: `Here's a simpler version:\n\n${text.split('.').slice(0, 3).join('. ')}. Focus on these main points.`,
      }
    case 'bullet_points':
      return {
        rewrittenText: `Key points:\n${text.split('.').filter(s => s.trim()).slice(0, 5).map(s => `• ${s.trim()}`).join('\n')}`,
      }
    case 'dyslexia_friendly':
      return {
        rewrittenText: `${text}\n\nTake your time reading this. Break it into small sections if needed.`,
      }
    case 'shorten':
      return {
        rewrittenText: text.split('.').slice(0, 2).join('. ') + '.',
      }
    default:
      return { rewrittenText: text }
  }
}

export async function generateStudentHints(input: StudentHintInput): Promise<StudentHintResponse> {
  const { requestType } = input

  // Guardrail: If student asks for answer, refuse
  const lowerContext = (input.taskContext + ' ' + (input.studentDraft || '')).toLowerCase()
  const refusalTriggers = ['write it for me', 'give me the answer', 'do it for me', 'complete it', 'finish it']
  const shouldRefuse = refusalTriggers.some(trigger => lowerContext.includes(trigger))

  if (shouldRefuse) {
    return {
      hints: [],
      questions: [],
      checklist: [],
      refusal: "I can't do the work for you, but I can help guide you. Try breaking the task into smaller steps and focus on understanding the key concepts.",
    }
  }

  switch (requestType) {
    case 'next_step':
      return {
        hints: [
          'Review the task instructions carefully',
          'Identify the main goal or question',
          'Break it down into smaller parts',
          'Start with the part you understand best',
          'Take notes as you work',
        ],
        questions: [],
        checklist: [],
        refusal: null,
      }
    case 'checklist':
      return {
        hints: [],
        questions: [],
        checklist: [
          'Have I read all the instructions?',
          'Do I understand what is being asked?',
          'Have I gathered the resources I need?',
          'Have I started working on the task?',
          'Am I checking my work as I go?',
        ],
        refusal: null,
      }
    case 'questions':
      return {
        hints: [],
        questions: [
          'What is the main goal of this task?',
          'What do I already know about this topic?',
          'What do I need to find out or learn?',
        ],
        checklist: [],
        refusal: null,
      }
    default:
      return {
        hints: [],
        questions: [],
        checklist: [],
        refusal: null,
      }
  }
}
