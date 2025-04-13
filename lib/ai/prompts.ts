/**
 * AI prompt templates for different operations
 */

export const prompts = {
  analyze: (transcript: string, language: string) => {
    const languageInstructions = language === "en" ? "Respond in English." : "Répondez en français."
    return `
      You are an educational assistant helping university students study.
      Analyze the following course transcript and:
      1. Determine the main subject of the course
      2. Create a concise outline with 3-5 key points
      
      Transcript:
      ${transcript}
      
      ${languageInstructions}
      
      IMPORTANT: Respond ONLY with a valid JSON object and nothing else. No markdown formatting, no backticks, no explanation text.
      The JSON must have this exact structure:
      {"subject": "The main subject of the course", "outline": ["Key point 1", "Key point 2", "Key point 3"]}
    `
  },
  
  generateBatch: (
    courseData: { subject: string, outline: string[] }, 
    transcript: string, 
    count: number, 
    language: string,
    difficulty: number = 3 // Default to medium difficulty
  ) => {
    const languageInstructions = language === "en" ? "Create the flashcards in English." : "Créez les fiches en français."
    
    // Difficulty-specific instructions
    let difficultyInstructions = "";
    
    switch(difficulty) {
      case 1: // Very simple
        difficultyInstructions = `
          Keep questions extremely simple and basic.
          Use elementary vocabulary and straightforward concepts.
          Focus only on the most fundamental information.
          Avoid complex terminology - use simple words.
          Create very short questions with direct answers.
          IMPORTANT: Limit answers to a maximum of 50 words.
          Each question should be no more than 20 words.
          Each question and answer combined should not exceed 70 words total.
        `;
        break;
      case 2: // Easy
        difficultyInstructions = `
          Keep questions fairly simple with basic concepts.
          Use common vocabulary that's accessible to beginners.
          Focus on foundational knowledge with minimal complexity.
          Limit technical terms to only the most essential ones.
          Create direct questions with clear answers.
          IMPORTANT: Limit answers to a maximum of 75 words.
          Each question should be no more than 25 words.
          Each question and answer combined should not exceed 100 words total.
        `;
        break;
      case 3: // Medium (default)
        difficultyInstructions = `
          Use moderate complexity with standard academic vocabulary.
          Balance basic recall with some analytical questions.
          Include key technical terms where appropriate.
          Create a mix of straightforward and thought-provoking questions.
          IMPORTANT: Limit answers to a maximum of 100 words.
          Each question should be no more than 30 words.
          Each question and answer combined should not exceed 130 words total.
        `;
        break;
      case 4: // Hard
        difficultyInstructions = `
          Create challenging questions requiring deeper understanding.
          Use advanced vocabulary and academic language.
          Include complex relationships between concepts.
          Encourage application of knowledge to novel situations.
          Create questions that require synthesis of multiple concepts.
          IMPORTANT: Limit answers to a maximum of 120 words.
          Each question should be no more than 40 words.
          Each question and answer combined should not exceed 160 words total.
          Focus on clear explanations of complex topics.
        `;
        break;
      case 5: // Expert
        difficultyInstructions = `
          Create very challenging questions at graduate/PhD level.
          Use specialized terminology and advanced theoretical concepts.
          Focus on nuanced understanding and critical analysis.
          Include questions requiring evaluation of competing theories.
          Create questions that connect complex ideas across different areas.
          IMPORTANT: Limit answers to a maximum of 150 words.
          Each question should be no more than 50 words.
          Each question and answer combined should not exceed 200 words total.
          Be concise while maintaining academic rigor.
        `;
        break;
    }
    return `
      You are an educational assistant helping university students study.
      Based on the following course information and transcript, create ${count} flashcards with questions and answers.
      
      Course Subject: ${courseData.subject}
      Course Outline: ${courseData.outline.join(", ")}
      
      Original Transcript:
      ${transcript}
      
      DIFFICULTY LEVEL: ${difficulty}/5
      ${difficultyInstructions}
      
      IMPORTANT INSTRUCTIONS:
      1. Use the actual content from the transcript to create questions, not just the subject and outline
      2. Vary the question types between:
         - Definitions (What is...?)
         - Comparisons (How does X compare to Y?)
         - Applications (How would you use...?)
         - Analysis (Why does...?)
         - Cause and Effect (What happens when...?)
         - Examples (Give an example of...)
      
      2. Use different question formats:
         - Open-ended questions
         - Fill-in-the-blank statements
         - True/False with explanation
         - "Identify the concept" questions
         - Multiple choice questions
         
      3. Vary the cognitive depth:
         - Basic recall (remembering facts)
         - Understanding (explaining concepts)
         - Application (using knowledge in new situations)
         - Analysis (breaking down complex ideas)
      
      4. Make questions:
         - Based on specific details from the transcript
         - Challenging but clear
         - Focused on key concepts
         - Engaging and thought-provoking
         - Different from each other
      
      ${languageInstructions}
      
      IMPORTANT: Respond ONLY with a valid JSON object and nothing else. No markdown formatting, no backticks, no explanation text.
      The JSON must have this exact structure:
      {"flashcards": [
        {"question": "Question 1", "answer": "Answer 1"},
        {"question": "Question 2", "answer": "Answer 2"},
        ... and so on for all ${count} flashcards
      ]}
    `
  },
  
  generateMCQBatch: (
    courseData: { subject: string, outline: string[] }, 
    transcript: string, 
    count: number, 
    language: string,
    difficulty: number = 3 // Default to medium difficulty
  ) => {
    const languageInstructions = language === "en" 
      ? "Create the questions in English." 
      : "Créez les questions en français."
    
    // Difficulty-specific instructions
    let difficultyInstructions = "";
    
    switch(difficulty) {
      case 1: // Very simple
        difficultyInstructions = `
          Keep questions extremely simple and basic.
          Use elementary vocabulary and straightforward concepts.
          Focus only on the most fundamental information.
          Avoid complex terminology - use simple words.
          Make all options clearly distinct from each other.
          Create very straightforward questions with obvious answers.
          IMPORTANT: Keep questions under 20 words.
          Keep each answer option under 10 words.
        `;
        break;
      case 2: // Easy
        difficultyInstructions = `
          Keep questions fairly simple with basic concepts.
          Use common vocabulary that's accessible to beginners.
          Focus on foundational knowledge with minimal complexity.
          Limit technical terms to only the most essential ones.
          Make incorrect options plausible but clearly different from the correct answer.
          IMPORTANT: Keep questions under 25 words.
          Keep each answer option under 15 words.
        `;
        break;
      case 3: // Medium (default)
        difficultyInstructions = `
          Use moderate complexity with standard academic vocabulary.
          Balance basic recall with some analytical questions.
          Include key technical terms where appropriate.
          Create a mix of straightforward and thought-provoking questions.
          Make incorrect options reasonably plausible.
          IMPORTANT: Keep questions under 30 words.
          Keep each answer option under 20 words.
        `;
        break;
      case 4: // Hard
        difficultyInstructions = `
          Create challenging questions requiring deeper understanding.
          Use advanced vocabulary and academic language.
          Include complex relationships between concepts.
          Make incorrect options very plausible and require careful discrimination.
          Create questions that require application of knowledge to novel situations.
          IMPORTANT: Keep questions under 40 words.
          Keep each answer option under 25 words.
        `;
        break;
      case 5: // Expert
        difficultyInstructions = `
          Create very challenging questions at graduate/PhD level.
          Use specialized terminology and advanced theoretical concepts.
          Focus on nuanced understanding and critical analysis.
          Make incorrect options extremely plausible, differing in subtle but important ways.
          Create questions that require synthesis of multiple complex concepts.
          IMPORTANT: Keep questions under 50 words.
          Keep each answer option under 30 words.
        `;
        break;
    }
    
    return `
      You are an educational assistant helping university students study.
      Based on the following course information and transcript, create ${count} multiple choice questions.
      
      Course Subject: ${courseData.subject}
      Course Outline: ${courseData.outline.join(", ")}
      
      Original Transcript:
      ${transcript}
      
      DIFFICULTY LEVEL: ${difficulty}/5
      ${difficultyInstructions}
      
      IMPORTANT INSTRUCTIONS:
      1. Each question must have exactly 4 options (A, B, C, D)
      2. Exactly one option must be correct
      3. The other 3 options must be plausible but incorrect
      4. Use actual content from the transcript
      5. Vary question difficulty and cognitive levels
      
      ${languageInstructions}
      
      CRITICAL: Reply ONLY with a valid JSON object. No explanations, no markdown formatting, no code block markers.
      
      Use this simplified JSON format:
      
      {"questions": [
        {
          "question": "What is the primary function of mitochondria in a cell?",
          "A": "Protein synthesis",
          "B": "Energy production",
          "C": "Cell division",
          "D": "Waste elimination",
          "correct": "B"
        },
        {
          "question": "Which programming paradigm treats computation as the evaluation of mathematical functions?",
          "A": "Procedural programming",
          "B": "Object-oriented programming",
          "C": "Functional programming",
          "D": "Event-driven programming",
          "correct": "C"
        }
      ]}
      
      Now create ${count} questions in this exact format based on the transcript provided.
    `
  }
}
